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
import { createBlock, getChildrenLengthByPageUid } from "roam-client";
import { getOauth } from "roamjs-components";
import { IMPORT_LABEL, mockApi, mockHighlights, mockRecordings } from "./util";

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
  thumbnail: string;
  checked: boolean;
};

type Props = {
  parentUid: string;
};

export const getRecordings = () => {
  // const { code } = JSON.parse(oauth);
  // Trigger GET Call on Grain
  const oauth = getOauth("grain");
  if (oauth === "{}") {
    return Promise.reject(
      new Error(
        "Need to log in with Grain to use Daily Grain Import! Head to roam/js/grain page to log in."
      )
    );
  }
  return mockApi({
    recordings: mockRecordings,
  });
  /*axios
      .get<{ recordings: Omit<Recording, "checked">[] }>(
        `${process.env.REST_API_URL}/grain-recordings}`,
        {
          headers: {
            Authorization: code,
          },
        }
      )*/
};

export const fetchEachRecording = (recordings: Omit<Recording, "checked">[]) =>
  Promise.all(
    recordings.map((r) =>
      mockApi({
        id: r.id,
        title: r.title,
        highlights: mockHighlights[r.id] || [],
      }).then((r) => r.data)
    )
  ).then((recordings) =>
    recordings.map((r) => ({
      text: `[[${r.title}]]`,
      children: r.highlights.map((h) => ({
        text: `${offsetToTimestamp(h.timestamp)} - ${h.text}`,
        children: h.url ? [{ text: `{{[[video]](${h.url})}}` }] : [],
      })),
    }))
  );

export const outputRecordings = (
  recordings: Omit<Recording, "checked">[],
  parentUid: string
) =>
  fetchEachRecording(recordings).then((rs) =>
    createBlock({
      parentUid,
      order: getChildrenLengthByPageUid(parentUid),
      node: {
        text: `#[[${IMPORT_LABEL}]]`,
        children: rs,
      },
    })
  );

const GrainFeed = ({ parentUid }: Props): React.ReactElement => {
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const onClose = useCallback(() => {
    ReactDOM.unmountComponentAtNode(
      document.getElementById("roamjs-grain-feed")
    );
  }, []);
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
      recordings.filter((r) => r.checked),
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
                    <img src={recording.thumbnail} style={{ height: 24 }} />
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
              label={"Check All"}
              style={{ marginBottom: 0 }}
              checked={recordings.every(({ checked }) => checked)}
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

export const render = (parent: HTMLDivElement, props: Props): void =>
  ReactDOM.render(<GrainFeed {...props} />, parent);

export default GrainFeed;
