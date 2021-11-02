import {
  Button,
  Checkbox,
  Classes,
  Dialog,
  Intent,
  Spinner,
} from "@blueprintjs/core";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  createBlock,
  extractTag,
  getChildrenLengthByPageUid,
  getPageUidByPageTitle,
  getRoamUrl,
  InputTextNode,
  openBlockInSidebar,
} from "roam-client";
import { createOverlayRender, getOauth, toFlexRegex } from "roamjs-components";
import {
  getIdsImported,
  getIdsImportedNode,
  getImportNode,
  getImportTree,
  IMPORT_LABEL,
} from "./util";
import axios from "axios";

const offsetToTimestamp = (offset?: number) => {
  if (!offset) {
    return "00:00";
  }
  const totalSeconds = Math.round(offset / 1000);
  const seconds = totalSeconds % 60;
  const minutes = Math.floor(totalSeconds / 60);
  return `${`${minutes}`.padStart(2, "0")}:${`${seconds}`.padStart(2, "0")}`;
};

type Recording = {
  id: string;
  title: string;
  url: string;
  end_datetime: string;
  start_datetime: string;
  thumbnail_url: string;
  checked: boolean;
  highlights: {
    created_datetime: string;
    duration: number;
    id: string;
    recording_id: string;
    text: string;
    thumbnail_url: string;
    timestamp: number;
    transcript: string;
    url: string;
  }[];
};

type Formats = { format: InputTextNode; highlightFormat: InputTextNode };

type Props = {
  parentUid: string;
  idsImported: Record<string, string>;
} & Formats;

const getAccessToken = () => {
  const oauth = getOauth("grain");
  if (oauth === "{}") {
    return Promise.reject(
      new Error(
        "Need to log in with Grain to use Daily Grain Import! Head to [[roam/js/grain]] page to log in."
      )
    );
  }
  const { access_token } = JSON.parse(oauth);
  return Promise.resolve({
    headers: {
      Authorization: `Bearer ${access_token}`,
    },
  });
};

export const getRecordings = () =>
  getAccessToken().then((opts) =>
    axios.get<{ recordings: Omit<Recording, "checked">[] }>(
      `https://grain.co/_/public-api/recordings`,
      opts
    )
  );

export const fetchEachRecording = (
  ids: string[],
  formats: Formats
): Promise<(InputTextNode & { id: string })[]> =>
  getAccessToken()
    .then((opts) =>
      Promise.all(
        ids.map((id) =>
          axios
            .get<Recording>(
              `https://grain.co/_/public-api/recordings/${id}?include_highlights=true`,
              opts
            )
            .then((r) => r.data)
        )
      )
    )
    .then((recordings) => {
      const interpolateHighlight = (
        n: InputTextNode,
        h: Recording["highlights"][number]
      ): InputTextNode => {
        return {
          ...n,
          uid: window.roamAlphaAPI.util.generateUID(),
          text: n.text
            .replace(/{text}/g, h.text)
            .replace(/{timestamp}/g, offsetToTimestamp(h.timestamp))
            .replace(/{duration}/g, offsetToTimestamp(h.duration))
            .replace(/{transcript}/g, h.transcript || "")
            .replace(/{video}/g, h.url ? `{{[[video]]:${h.url}}}` : ""),
          children: (n.children || []).map((c) => interpolateHighlight(c, h)),
        };
      };
      const interpolateFormat = (
        n: InputTextNode,
        r: Recording
      ): InputTextNode[] => {
        const siblings = /{highlights}/.test(n.text)
          ? r.highlights.map((h) =>
              interpolateHighlight(formats.highlightFormat, h)
            )
          : [];
        const text = n.text
          .replace(/{title}/g, r.title)
          .replace(/{start}/g, new Date(r.start_datetime).toLocaleString())
          .replace(/{end}/g, new Date(r.end_datetime).toLocaleString())
          .replace(/{highlights}/g, "");
        return [
          {
            ...n,
            uid: window.roamAlphaAPI.util.generateUID(),
            text,
            children: (n.children || []).flatMap((c) =>
              interpolateFormat(c, r)
            ),
          },
          ...siblings,
        ].filter((n) => !!n.text || !!n.children.length);
      };
      return recordings.map((r) => ({
        ...interpolateFormat(formats.format, r)[0],
        id: r.id,
      }));
    });

export const outputRecordings = (
  ids: string[],
  parentUid: string,
  formats: Formats
) =>
  fetchEachRecording(ids, formats).then((rs) => {
    createBlock({
      parentUid,
      order: getChildrenLengthByPageUid(parentUid),
      node: {
        text: `#[[${IMPORT_LABEL}]]`,
        children: rs,
      },
    });
    const importNode = getImportNode();
    const idUid =
      getIdsImportedNode(getImportTree(importNode))?.uid ||
      createBlock({
        node: { text: "ids" },
        parentUid: importNode?.uid,
        order: 1,
      });
    rs.forEach(({ uid, id }) =>
      createBlock({
        node: { text: uid, children: [{ text: id }] },
        parentUid: idUid,
      })
    );
  });

const TAG_REGEX = /(\[\[[^[\]]+\]\])/;

const RoamTag = ({
  title,
  onClick,
}: {
  title: string;
  onClick: () => void;
}) => {
  const uid = useMemo(() => getPageUidByPageTitle(title), [title]);
  return (
    <span
      data-link-title={title}
      data-link-uid={uid}
      onClick={(e) => {
        if (e.shiftKey) {
          openBlockInSidebar(uid);
          e.preventDefault();
        } else {
          window.location.assign(getRoamUrl(uid));
          // weird roam bug where it wipes out previous navigation
          setTimeout(() => window.location.assign(getRoamUrl(uid)), 100);
        }
        onClick();
      }}
    >
      <span className="rm-page-ref__brackets">[[</span>
      <span tabIndex={-1} className="rm-page-ref rm-page-ref--link">
        {title}
      </span>
      <span className="rm-page-ref__brackets">]]</span>
    </span>
  );
};

const GrainFeed = ({
  parentUid,
  idsImported,
  onClose,
  ...formats
}: Props & { onClose: () => void }): React.ReactElement => {
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const recordingIds = useMemo(
    () => new Set(Object.values(idsImported || getIdsImported())),
    [idsImported]
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const onCancel = useCallback(() => {
    createBlock({
      parentUid,
      order: getChildrenLengthByPageUid(parentUid),
      node: {
        text: `#[[${IMPORT_LABEL}]]`,
        children: [
          {
            text: "Cancelled",
            children: [],
          },
        ],
      },
    });
    onClose();
  }, [onClose, parentUid]);
  useEffect(() => {
    getRecordings()
      .then((r) => {
        const recs = r.data.recordings
          .filter((r) => !recordingIds.has(r.id))
          .map((t) => ({ ...t, checked: false }));
        setRecordings(recs);
      })
      .catch((r) => setError(r.response?.data || r.message))
      .finally(() => setLoading(false));
    window.addEventListener("hashchange", onClose);
    return () => window.removeEventListener("hashchange", onClose);
  }, [setRecordings, onClose, recordingIds]);
  const onClick = useCallback(() => {
    setLoading(true);
    outputRecordings(
      recordings.filter((r) => r.checked).map((r) => r.id),
      parentUid,
      formats
    ).finally(onClose);
  }, [recordings, onClose, parentUid, formats]);
  return (
    <Dialog
      isOpen={true}
      onClose={onCancel}
      canOutsideClickClose
      canEscapeKeyClose
      title={`Import Grain Recording`}
    >
      <div className={Classes.DIALOG_BODY}>
        {loading ? (
          <Spinner />
        ) : error ? (
          <span style={{ color: "darkred" }}>
            {error
              .split(new RegExp(TAG_REGEX, "g"))
              .map((e, i) =>
                TAG_REGEX.test(e) ? (
                  <RoamTag key={i} title={extractTag(e)} onClick={onClose} />
                ) : (
                  <React.Fragment key={i}>{e}</React.Fragment>
                )
              )}
          </span>
        ) : (
          <>
            <div className={"roamjs-grain-feed-body"}>
              {!!recordings.length && (
                <Checkbox
                  disabled={loading}
                  label={"Check All"}
                  checked={
                    !!recordings.length &&
                    recordings.every(({ checked }) => checked)
                  }
                  onChange={(e) =>
                    setRecordings(
                      recordings.map((r) => ({
                        ...r,
                        checked: (e.target as HTMLInputElement).checked,
                      }))
                    )
                  }
                />
              )}
              {recordings.map((recording) => (
                <Checkbox
                  key={recording.id}
                  checked={recording.checked}
                  onChange={(e: React.FormEvent<HTMLInputElement>) =>
                    setRecordings(
                      recordings.map((r) =>
                        r.id === recording.id
                          ? {
                              ...r,
                              checked: (e.target as HTMLInputElement).checked,
                            }
                          : r
                      )
                    )
                  }
                >
                  <div
                    style={{
                      display: "inline-flex",
                      verticalAlign: "middle",
                      width: "100%",
                      justifyContent: "space-between",
                      fontWeight: 400,
                    }}
                  >
                    <span>{recording.title}</span>
                    <img src={recording.thumbnail_url} style={{ height: 24 }} />
                  </div>
                </Checkbox>
              ))}
              {!recordings.length && <span>No new recordings available.</span>}
            </div>
          </>
        )}
        <div className={Classes.DIALOG_FOOTER}>
          <div className={Classes.DIALOG_FOOTER_ACTIONS}>
            <Button
              onClick={onClick}
              intent={Intent.PRIMARY}
              style={{ marginTop: 16 }}
              disabled={loading}
            >
              {recordings.length ? "IMPORT" : "OK"}
            </Button>
          </div>
        </div>
      </div>
    </Dialog>
  );
};

export const render = createOverlayRender<Props>("grain-feed", GrainFeed);

export default GrainFeed;
