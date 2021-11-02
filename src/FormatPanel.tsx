import React, { useEffect, useMemo, useRef, useState } from "react";
import { getFirstChildUidByBlockUid, InputTextNode } from "roam-client";
import { createBlock } from "roam-client/lib/writes";

export const DEFAULT_FORMAT = {
  text: "[[{title}]] ({start}) - ({end})",
  children: [{ text: "{highlights}" }],
};

export const DEFAULT_HIGHLIGHT_FORMAT = {
  text: "{timestamp} {text} - ({duration})",
  children: [{ text: "{transcript}" }, { text: "{video}" }],
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
  const formatUid = useMemo(
    () =>
      initialUid ||
      createBlock({ node: { text: title, children: [] }, parentUid }),
    [initialUid, parentUid, title]
  );
  const containerRef = useRef(null);
  useEffect(() => {
    if (containerRef.current) {
      const uid =
        getFirstChildUidByBlockUid(formatUid) ||
        createBlock({ node: defaultValue[0], parentUid: formatUid });
      window.roamAlphaAPI.ui.components.renderBlock({
        uid,
        el: containerRef.current,
      });
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
