import React, { useEffect, useMemo, useRef, useState } from "react";
import { InputTextNode } from "roamjs-components/types/native";
import createBlock from "roamjs-components/writes/createBlock";
import getFirstChildUidByBlockUid from "roamjs-components/queries/getFirstChildUidByBlockUid";

export const DEFAULT_RECORDING_FORMAT = {
  text: "[[{title}]] [->]({url}) ({start:dd/MM/yyyy} {start:hh:mm a} - {end:hh:mm a})",
  children: [
    { text: "Participants", children: [{ text: "{participants}" }] },
    { text: "Highlights", children: [{ text: "{highlights}" }] },
  ],
};

export const DEFAULT_HIGHLIGHT_FORMAT = {
  text: "{timestamp} [{text}]({url}) - ({duration})",
  children: [{ text: "{transcript}" }, { text: "{video}" }],
};

export const DEFAULT_PARTICIPANT_FORMAT = {
  text: "[[{name}]]",
  children: [{ text: "({email})" }],
};

const FormatPanel = ({
  uid: initialUid,
  parentUid,
  title,
  defaultValue,
}: {
  uid?: string;
  parentUid: string;
  title: string;
  defaultValue?: [InputTextNode];
}) => {
  const formatUid = useMemo(() => {
    if (initialUid) return initialUid;
    const nodeUid = window.roamAlphaAPI.util.generateUID();
    createBlock({
      node: { text: title, children: [], uid: nodeUid },
      parentUid,
    });
    return nodeUid;
  }, [initialUid, parentUid, title]);
  const containerRef = useRef(null);
  useEffect(() => {
    if (containerRef.current) {
      Promise.resolve(
        getFirstChildUidByBlockUid(formatUid) ||
          createBlock({ node: defaultValue[0], parentUid: formatUid })
      ).then((uid) =>
        window.roamAlphaAPI.ui.components.renderBlock({
          uid,
          el: containerRef.current,
        })
      );
    }
  }, [formatUid, containerRef, defaultValue]);
  return (
    <div
      ref={containerRef}
      style={{
        border: "1px solid #33333333",
        padding: "8px 0",
        borderRadius: 4,
      }}
    ></div>
  );
};

export default FormatPanel;
