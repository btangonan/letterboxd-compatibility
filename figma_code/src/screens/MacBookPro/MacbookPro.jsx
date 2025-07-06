import React from "react";
import { Frame } from "./sections/Frame";
import { FrameWrapper } from "./sections/FrameWrapper";

export const MacbookPro = () => {
  return (
    <div
      className="flex flex-col items-start gap-[33px] pl-[83px] pr-[82px] pt-[30px] pb-[108px] relative bg-[#fbf9f5]"
      data-model-id="1:3"
    >
      <Frame />
      <FrameWrapper />
    </div>
  );
};
