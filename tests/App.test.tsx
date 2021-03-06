import React from "react";
import ReactDOM from "react-dom";
import TestUtils from "react-dom/test-utils";
import { App } from "@client/components/App";

it("App is rendered", () => {
  const appElement: any = TestUtils.renderIntoDocument(
    // wrapped in a div because function components don't have an instance
    <div>
      <App />
    </div>,
  );
  const appNode = ReactDOM.findDOMNode(appElement);

  expect(appNode.textContent).toEqual("Hello World!");
});
