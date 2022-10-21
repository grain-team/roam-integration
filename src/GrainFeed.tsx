import {
  Button,
  Checkbox,
  Classes,
  Dialog,
  Intent,
  Spinner,
  Tab,
  Tabs,
} from "@blueprintjs/core";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import createBlock from "roamjs-components/writes/createBlock";
import extractTag from "roamjs-components/util/extractTag";
import getChildrenLengthByPageUid from "roamjs-components/queries/getChildrenLengthByPageUid";
import getPageUidByPageTitle from "roamjs-components/queries/getPageUidByPageTitle";
import getRoamUrl from "roamjs-components/dom/getRoamUrl";
import { InputTextNode } from "roamjs-components/types/native";
import openBlockInSidebar from "roamjs-components/writes/openBlockInSidebar";
import createOverlayRender from "roamjs-components/util/createOverlayRender";
import getOauth from "roamjs-components/util/getOauth";
import { render as renderToast } from "roamjs-components/components/Toast";
import {
  getIdsImported,
  getIdsImportedNode,
  getImportNode,
  getImportTree,
  IMPORT_LABEL,
} from "./util";
import axios from "axios";
import dateFnsFormat from "date-fns/format";
import differenceInMilliseconds from "date-fns/differenceInMilliseconds";

const offsetToTimestamp = (offset?: number) => {
  if (!offset) {
    return "00:00";
  }
  const totalSeconds = Math.round(offset / 1000);
  const seconds = totalSeconds % 60;
  const minutes = Math.floor(totalSeconds / 60);
  return `${`${minutes}`.padStart(2, "0")}:${`${seconds}`.padStart(2, "0")}`;
};

const formatDate = (inputDate: string, format?: string) => {
  const d = new Date(inputDate);
  return format ? dateFnsFormat(d, format) : d.toLocaleString();
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
  participants: {
    email: string;
    name: string;
  }[];
};

type Formats = {
  recordingFormat: InputTextNode;
  highlightFormat: InputTextNode;
  participantFormat: InputTextNode;
};

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

export const getRecordings = (type?: "attended" | "hosted" | "all") =>
  getAccessToken().then((opts) =>
    axios.get<{ recordings: Omit<Recording, "checked">[] }>(
      `https://grain.co/_/public-api/recordings${
        type !== "all" ? `?attendance=${type}` : ""
      }`,
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
              `https://grain.co/_/public-api/recordings/${id}?include_highlights=true&include_participants=true`,
              opts
            )
            .then((r) => r.data)
        )
      )
    )
    .then((recordings) => {
      const interpolateParticipant = (
        n: InputTextNode,
        p: Recording["participants"][number]
      ): InputTextNode => {
        return {
          ...n,
          uid: window.roamAlphaAPI.util.generateUID(),
          text: n.text
            .replace(/{name}/g, p.name || "")
            .replace(/{email}/g, p.email || ""),
          children: (n.children || [])
            .map((c) => interpolateParticipant(c, p))
            .filter((n) => !!n.text || !!n.children.length),
        };
      };
      const interpolateHighlight = (
        n: InputTextNode,
        h: Recording["highlights"][number]
      ): InputTextNode => {
        return {
          ...n,
          uid: window.roamAlphaAPI.util.generateUID(),
          text: n.text
            .replace(/{text}/g, h.text)
            .replace(/{url}/g, h.url)
            .replace(/{timestamp}/g, offsetToTimestamp(h.timestamp))
            .replace(/{duration}/g, offsetToTimestamp(h.duration))
            .replace(/{transcript}/g, h.transcript || "")
            .replace(/{video}/g, h.url ? `{{[[video]]:${h.url}}}` : ""),
          children: (n.children || [])
            .map((c) => interpolateHighlight(c, h))
            .filter((n) => !!n.text || !!n.children.length),
        };
      };
      const interpolateFormat = (
        n: InputTextNode,
        r: Recording
      ): InputTextNode[] => {
        const siblings = [
          ...(/{highlights}/.test(n.text)
            ? r.highlights.map((h) =>
                interpolateHighlight(formats.highlightFormat, h)
              )
            : []),
          ...(/{participants}/.test(n.text)
            ? r.participants.map((p) =>
                interpolateParticipant(formats.participantFormat, p)
              )
            : []),
        ];
        const text = n.text
          .replace(/{title}/g, r.title)
          .replace(/{start(?::([^}]+))?}/g, (_, format) =>
            formatDate(r.start_datetime, format)
          )
          .replace(/{end(?::([^}]+))?}/g, (_, format) =>
            formatDate(r.end_datetime, format)
          )
          .replace(
            /{duration}/,
            offsetToTimestamp(
              differenceInMilliseconds(
                new Date(r.end_datetime),
                new Date(r.start_datetime)
              )
            )
          )
          .replace(/{url}/g, r.url)
          .replace(/{highlight_count}/g, `${r.highlights.length}`)
          .replace(/{highlights}/g, "")
          .replace(/{participants}/g, "");
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
        ...interpolateFormat(formats.recordingFormat, r)[0],
        id: r.id,
      }));
    });

export const outputRecordings = (
  ids: string[],
  parentUid: string,
  formats: Formats
) =>
  fetchEachRecording(ids, formats).then(async (rs) => {
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
      (await createBlock({
        node: { text: "ids" },
        parentUid: importNode?.uid,
        order: 1,
      }));
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

type AttendanceType = Parameters<typeof getRecordings>[0];
const TAB_IDS = {
  all: "All Recordings",
  attended: "Recordings Attended",
  hosted: "Recordings Hosted",
} as const;

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
  const [attendanceType, setAttendanceType] =
    useState<AttendanceType>("attended");
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
    setLoading(true);
    setError("");
    getRecordings(attendanceType)
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
  }, [setRecordings, onClose, recordingIds, attendanceType]);
  const onClick = useCallback(() => {
    setLoading(true);
    outputRecordings(
      recordings.filter((r) => r.checked).map((r) => r.id),
      parentUid,
      formats
    )
      .catch((e) =>
        renderToast({
          id: "grain-fetch-error",
          content: `Failed to output recordings: ${e.message}`,
        })
      )
      .finally(onClose);
  }, [recordings, onClose, parentUid, formats]);

  return (
    <Dialog
      isOpen={true}
      onClose={onCancel}
      canOutsideClickClose
      canEscapeKeyClose
      title={`Import Grain Recording`}
    >
      <div className={`${Classes.DIALOG_BODY} roamjs-grain-import-body`}>
        <Tabs
          selectedTabId={TAB_IDS[attendanceType]}
          onChange={(t) =>
            setAttendanceType(
              Object.keys(TAB_IDS)
                .map((k) => k as keyof typeof TAB_IDS)
                .find((k) => TAB_IDS[k] === t)
            )
          }
        >
          <Tab id={TAB_IDS["attended"]} title={TAB_IDS["attended"]} />
          <Tab id={TAB_IDS["hosted"]} title={TAB_IDS["hosted"]} />
          <Tab id={TAB_IDS["all"]} title={TAB_IDS["all"]} />
        </Tabs>
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
