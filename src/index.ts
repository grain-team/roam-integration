import {
  addStyle,
  createBlock,
  createBlockObserver,
  createIconButton,
  createPageTitleObserver,
  deleteBlock,
  getBasicTreeByParentUid,
  getCurrentPageUid,
  getLinkedPageTitlesUnderUid,
  getUids,
  toRoamDate,
  toRoamDateUid,
} from "roam-client";
import { createConfigObserver, toFlexRegex } from "roamjs-components";
import GrainLogo from "./assets/grain.svg";
import {
  fetchEachRecording,
  getRecordings,
  outputRecordings,
  render,
} from "./GrainFeed";
import { render as renderLoadingAlert } from "./LoadingAlert";
import { CONFIG, getIdsImported, IMPORT_LABEL, getImportTree } from "./util";
import axios from "axios";
import pkceChallenge from "pkce-challenge";

addStyle(`.grain-loading-alert .bp3-alert-footer {
  display: none;
}

.grain-loading-alert .bp3-alert-contents {
  margin:auto;
}

.grain-loading-alert.bp3-alert {
  max-width: fit-content;
}`);

const codeVerifierRef = { current: "" };
const generateCodeVerifier = () => {
  const { code_verifier, code_challenge } = pkceChallenge();
  codeVerifierRef.current = code_verifier;
  return code_challenge;
};
createConfigObserver({
  title: CONFIG,
  config: {
    tabs: [
      {
        id: "home",
        fields: [
          {
            title: "oauth",
            type: "oauth",
            description: "Log in to your Grain account",
            options: {
              service: "grain",
              ServiceIcon: GrainLogo,
              getPopoutUrl: () =>
                Promise.resolve(
                  `https://grain.co/_/public-api/oauth2/authorize?client_id=${
                    process.env.GRAIN_CLIENT_ID
                  }&response_type=code&code_challenge=${generateCodeVerifier()}&code_challenge_method=S256&redirect_uri=${encodeURIComponent(
                    "https://roamjs.com/oauth?auth=true"
                  )}`
                ),
              getAuthData: (data) => {
                const body = {
                  grant_type: "authorization_code",
                  client_id: process.env.GRAIN_CLIENT_ID,
                  code: JSON.parse(data).code,
                  code_verifier: codeVerifierRef.current,
                };
                const formData = new FormData();
                Object.entries(body).forEach((e) => formData.append(...e));
                return axios
                  .post(
                    "https://grain.co/_/public-api/oauth2/token",
                    formData,
                    {
                      headers: {
                        "Content-Type": "multipart/form-data",
                      },
                    }
                  )
                  .then((r) =>
                    axios
                      .get("https://grain.co/_/public-api/me", {
                        headers: {
                          Authorization: `Bearer ${r.data.access_token}`,
                        },
                      })
                      .then((me) => ({ ...r.data, label: me.data.name }))
                  );
              },
            },
          },
        ],
      },
      {
        id: "import",
        fields: [
          {
            title: "auto import",
            type: "flag",
            description:
              "Automatically import recordings each day instead of showing an import dialog",
          },
        ],
      },
    ],
  },
});

const today = new Date();
const title = toRoamDate(today);
const parentUid = toRoamDateUid(today);
createPageTitleObserver({
  title,
  log: true,
  callback: () => {
    const tags = new Set(getLinkedPageTitlesUnderUid(parentUid));
    if (!tags.has(IMPORT_LABEL)) {
      const importTree = getImportTree();
      if (importTree.some((t) => toFlexRegex("auto import").test(t.text))) {
        const idsImported = getIdsImported();
        const ids = new Set(Object.values(idsImported));
        getRecordings().then((r) =>
          outputRecordings(
            r.data.recordings.map((i) => i.id).filter((id) => !ids.has(id)),
            parentUid
          )
        );
      } else {
        render({ parentUid });
      }
    }
  },
});

createBlockObserver((b: HTMLDivElement) => {
  if (!b.hasAttribute("data-grain-refresh-import")) {
    const isImport = Array.from(
      b.getElementsByClassName("rm-page-ref--tag")
    ).some((r) => r.getAttribute("data-tag") === IMPORT_LABEL);
    if (isImport) {
      b.setAttribute("data-grain-refresh-import", "true");
      const updateButton = createIconButton("refresh");
      updateButton.style.float = "right";
      updateButton.onmousedown = (e) => e.stopPropagation();
      updateButton.onclick = () => {
        const { blockUid } = getUids(b);
        renderLoadingAlert({
          operation: () => {
            const recordings = getBasicTreeByParentUid(blockUid);
            const idsImported = getIdsImported();
            return fetchEachRecording(
              recordings
                .filter((r) => !!idsImported[r.uid])
                .map((r) => {
                  deleteBlock(r.uid);
                  return idsImported[r.uid];
                })
            ).then((rs) => {
              rs.forEach((node, order) =>
                createBlock({ node, order, parentUid: blockUid })
              );
            });
          },
        });
      };
      b.appendChild(updateButton);
    }
  }
});

window.roamAlphaAPI.ui.commandPalette.addCommand({
  label: "Open Grain Feed",
  callback: () => render({ parentUid: getCurrentPageUid() }),
});
