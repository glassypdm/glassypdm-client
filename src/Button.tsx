import { useButton } from "react-aria";
import { useRef } from "react";

export function Button(props: any) {
    let ref = useRef(null);
    let { buttonProps } = useButton(props, ref);
  
    return (
      <button {...buttonProps} ref={ref}>
        {props.children}
      </button>
    );
}