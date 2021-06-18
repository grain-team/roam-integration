import {
  Button,
  Checkbox,
  Classes,
  Dialog,
  Intent,
  Spinner,
} from "@blueprintjs/core";
import axios from "axios";
import React, { useCallback, useEffect, useState } from "react";
import ReactDOM from "react-dom";
import { createBlock, getChildrenLengthByPageUid } from "roam-client";
import { getOauth } from "roamjs-components";
import { IMPORT_LABEL } from "./util";

const mockApi = <T extends unknown>(data: T) =>
  new Promise<{ data: T }>((resolve) => {
    setTimeout(() => {
      resolve({ data });
    }, 1000);
  });

const mockHighlights = {
  "4650a127-4a2d-409a-b1ea-00514016107c": [
    {
      text: "I could take notes during???",
      timestamp: 6432,
      url: "https://media.grain.co/clips/v1/32e58c59-1b50-4af9-a202-5d094056aa09/Mfv9oF0QBdkMTGsM2f2Dy2JaW8Tp051u.mp4?response-content-disposition=attachment%3B+filename%3D%22Grain+Highlight+i2Y06dS7A4ApeNSJo50Yq71C8NWWakbM8mi1Fleo.mp4%22&response-content-type=video%2Fmp4",
    },
    {
      text: "👍",
      timestamp: 15178,
    },
    {
      text: "can someone else take notes",
      timestamp: 116512,
    },
    {
      text: "🚩",
      timestamp: 142609,
    },
    {
      text: "and stuff",
      timestamp: 255913,
    },
  ],
  "e9be387d-af60-4bdb-b101-c53d518bc1e1": [
    {
      text: "second call!",
      timestamp: 0,
      url: undefined,
    },
    {
      text: "weird",
      timestamp: 9094,
    },
    {
      text: "👍",
      timestamp: 14342,
    },
    {
      text: "⭐️",
      timestamp: 18878,
    },
  ],
  "95193bf3-2759-46a4-b617-24e196a88156": [],
} as { [k: string]: { text: string; timestamp: number; url: string }[] };

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
    recordings: [
      {
        id: "e9be387d-af60-4bdb-b101-c53d518bc1e1",
        title: "Internal musings",
        thumbnail:
          "https://media.grain.co/thumbnails/e9be387d-af60-4bdb-b101-c53d518bc1e1/recording_thumb.jpeg?Expires=1623401655&Key-Pair-Id=APKAJVV5JYWNSB7CAGWA&Signature=RvzIJog-fqE~skwyochR-295Z-~GBSoR8jokCGGyn2xZ2IrgWstiQiLWXfXNBkUEfyrxkKBGu0MUXaIr-ABQ9BeG8amy7ryIk8t7JnNClOo2QGD2GDRBMYX0c5WbwrwZjiUrMvDNoWl0xTZgm8PkAIj9PnxYv72hrkFSP2qNbQBMi-6ecjcNt12SdKFVlxWbb0oeq0mQa6rHgYwavTw7edWTjp7ZshRH87~nojjQPmX7-Xdu-dL3-y3zDy-88dmhsDQ6lFsdLWZ~QK1rjcYrwFbeX7H55fv3WixiKD8-VcP58MkHhUBJcehApUiS5W32U4T12BJdBF0rtu3KVntA4w__",
      },
      {
        id: "4650a127-4a2d-409a-b1ea-00514016107c",
        title: "Daysi and I shooting the shit",
        thumbnail:
          "https://media.grain.co/thumbnails/4650a127-4a2d-409a-b1ea-00514016107c/recording_thumb.jpeg?Expires=1623401655&Key-Pair-Id=APKAJVV5JYWNSB7CAGWA&Signature=i6CMVE849HRtXueiks9fuNlSweGscUXUfQgCuwC7LUmt9b0-y-IMBxOdTIS8iCzQ6ADecOcaAMTLb1mQEJE22PhcQnJMGx-7VVCboKS-NjTlqdv~2IJOwrEGnG6CeWHtXParJf3SixnqQloGyfadzvADgxW93GWquzmh~xwsPiN67Of1~llikOzH6h6Pqm65cTIFSsVOAdUiy4q4IOok8io5aWe-XgNQX-dkCbKsz58YZIjDUxP9oNTHUJcP5fGinOwM-CnIqYDx1QUfeqrjgaLEPFxgi400dpk2mN9m8w-munWe0SiqTu9xLqiplDr3Ny9O3TbpYlOQYBIwaEhIaw__",
      },
      {
        id: "95193bf3-2759-46a4-b617-24e196a88156",
        title: "Sample Recording",
        thumbnail:
          "https://media.grain.co/thumbnails/95193bf3-2759-46a4-b617-24e196a88156/recording_thumb.jpeg?Expires=1623401655&Key-Pair-Id=APKAJVV5JYWNSB7CAGWA&Signature=ZteZsyp4SkJItx4ZG7n54piWDoRizxJ9FJPdov9VhyXwHfG9O2jWUuGKuV40M~gXsZlr6B2kJ9d9tJspmG87U6psQ4sTOdy8vEldfcjd0ocIWU4GjjNBsqjuNhTHQPJjy7er-PbwWJiKhMJ79g8FBD1Bd-LdO4Er6U7mlE9R-Czc9l3k903tjcA~YC4jTLjaqauGKBx1I~z7vb75uEBU~GFvUBYOcMP1P0QeXi3naeo0~6fexZIZMtIw2jZKdJ72HTqozpO~wOyXcFh~Fs0exX2eaIVIy1-oAtcknzu-e1NFSL9c0eoKjO3mPP63YmIGx8Bke6zmZUxeZz~cucS5tw__",
      },
    ],
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

export const outputRecordings = (
  recordings: Omit<Recording, "checked">[],
  parentUid: string
) =>
  Promise.all(
    recordings.map((r) =>
      mockApi({
        id: r.id,
        title: r.title,
        highlights: mockHighlights[r.id] || [],
      }).then((r) => r.data)
    )
  ).then((recordings) =>
    createBlock({
      parentUid,
      order: getChildrenLengthByPageUid(parentUid),
      node: {
        text: `#[[${IMPORT_LABEL}]]`,
        children: recordings.map((r) => ({
          text: `[[${r.title}]]`,
          children: r.highlights.map((h) => ({
            text: `${offsetToTimestamp(h.timestamp)} - ${h.text}`,
            children: h.url ? [{ text: `{{[[video]](${h.url})}}` }] : [],
          })),
        })),
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
