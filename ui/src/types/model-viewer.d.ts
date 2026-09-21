declare namespace JSX {
  interface IntrinsicElements {
    'model-viewer': {
      className?: string;
      src?: string;
      alt?: string;
      cameraControls?: boolean;
      ['camera-controls']?: boolean;
      disableZoom?: boolean;
      ['disable-zoom']?: boolean;
      interactionPrompt?: string;
      ['interaction-prompt']?: string;
      autoplay?: boolean;
      animationName?: string;
      ['animation-name']?: string;
      shadowIntensity?: string | number;
      ['shadow-intensity']?: string | number;
      exposure?: string | number;
      onError?: (event: unknown) => void;
      children?: React.ReactNode;
    };
  }
}
