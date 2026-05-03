import { Composition } from "remotion";
import { MayFourthLaunch } from "./MayFourthLaunch";

export const Root: React.FC = () => {
  return (
    <Composition
      id="MayFourthLaunch"
      component={MayFourthLaunch}
      durationInFrames={900}
      fps={30}
      width={1080}
      height={1350}
    />
  );
};
