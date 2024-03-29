import getBasicTreeByParentUid from "roamjs-components/queries/getBasicTreeByParentUid";
import getPageUidByPageTitle from "roamjs-components/queries/getPageUidByPageTitle";
import toFlexRegex from "roamjs-components/util/toFlexRegex";

export const IMPORT_LABEL = "Grain Recordings";
export const CONFIG = "roam/js/grain";

export const getImportNode = () =>
  getBasicTreeByParentUid(getPageUidByPageTitle(CONFIG)).find((t) =>
    toFlexRegex("import").test(t.text)
  );

export const getImportTree = (importNode = getImportNode()) =>
  importNode?.children || [];

export const getIdsImportedNode = (importTree = getImportTree()) =>
  importTree.find((t) => toFlexRegex("ids").test(t.text));

export const getIdsImported = (importTree = getImportTree()) =>
  Object.fromEntries(
    (getIdsImportedNode(importTree)?.children || []).map((t) => [
      t.text,
      t.children[0]?.text,
    ])
  );
