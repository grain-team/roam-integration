import {
  Button,
  Checkbox,
  Classes,
  Dialog,
  Intent,
  Spinner,
} from "@blueprintjs/core";
import React, { useCallback, useEffect, useState } from "react";
import ReactDOM from "react-dom";
import {
  createBlock,
  getBasicTreeByParentUid,
  getChildrenLengthByPageUid,
  getPageUidByPageTitle,
  InputTextNode,
} from "roam-client";
import { createOverlayRender, getOauth, toFlexRegex } from "roamjs-components";
import {
  CONFIG,
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
};

type Props = {
  parentUid: string;
};

const getAccessToken = () => {
  const oauth = getOauth("grain");
  if (oauth === "{}") {
    return Promise.reject(
      new Error(
        "Need to log in with Grain to use Daily Grain Import! Head to roam/js/grain page to log in."
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
  ids: string[]
): Promise<(InputTextNode & { id: string })[]> =>
  getAccessToken()
    .then((opts) =>
      Promise.all(
        ids.map((id) =>
          axios
            .get<Recording>(
              `https://grain.co/_/public-api/recordings/${id}`,
              opts
            )
            .then((r) => r.data)
        )
      )
    )
    .then((recordings) =>
      recordings.map((r) => ({
        uid: window.roamAlphaAPI.util.generateUID(),
        text: `[[${r.title}]]`,
        children: [
          {
            text: "highlights",
            children: /*r.highlights*/ [].map((h) => ({
              text: `${offsetToTimestamp(h.timestamp)} - ${h.text}`,
              children: h.url ? [{ text: `{{[[video]]:${h.url}}}` }] : [],
            })),
          },
        ],
        id: r.id,
      }))
    );

export const outputRecordings = (ids: string[], parentUid: string) =>
  fetchEachRecording(ids).then((rs) => {
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

const GrainFeed = ({
  parentUid,
  onClose,
}: Props & { onClose: () => void }): React.ReactElement => {
  const [recordings, setRecordings] = useState<Recording[]>([]);
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
        setRecordings(r.data.recordings.map((t) => ({ ...t, checked: false })));
      })
      .catch((r) => setError(r.response?.data || r.message))
      .finally(() => setLoading(false));
  }, [setRecordings]);
  const onClick = useCallback(() => {
    setLoading(true);
    outputRecordings(
      recordings.filter((r) => r.checked).map((r) => r.id),
      parentUid
    ).finally(onClose);
  }, [recordings, onClose, parentUid]);
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
          <span style={{ color: "darkred" }}>{error}</span>
        ) : (
          <>
            <div
              style={{
                maxHeight: 760,
                overflowY: "scroll",
                paddingBottom: 16,
                paddingLeft: 4,
              }}
            >
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
                    }}
                  >
                    <span>{recording.title}</span>
                    <img src={recording.thumbnail_url} style={{ height: 24 }} />
                  </div>
                </Checkbox>
              ))}
              {!recordings.length && <span>No recordings available.</span>}
            </div>
          </>
        )}
        <div className={Classes.DIALOG_FOOTER}>
          <div
            className={Classes.DIALOG_FOOTER_ACTIONS}
            style={{ justifyContent: "space-between", alignItems: "baseline" }}
          >
            <Checkbox
              disabled={loading}
              label={"Check All"}
              style={{ marginBottom: 0 }}
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
