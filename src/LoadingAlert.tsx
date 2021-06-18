import { Alert, Spinner, SpinnerSize } from "@blueprintjs/core";
import React, { useEffect } from "react";
import { createOverlayRender } from "roamjs-components";

type Props = {
  operation: () => Promise<unknown>;
};

const LoadingAlert = ({
  onClose,
  operation,
}: {
  onClose: () => void;
} & Props) => {
  useEffect(() => {
    operation().finally(onClose);
  }, [operation, onClose]);
  return (
    <Alert
      isOpen={true}
      onClose={onClose}
      confirmButtonText={""}
      className={"grain-loading-alert"}
    >
      <Spinner size={SpinnerSize.LARGE} />
    </Alert>
  );
};

export const render = createOverlayRender<Props>("loading-alert", LoadingAlert);

export default LoadingAlert;
