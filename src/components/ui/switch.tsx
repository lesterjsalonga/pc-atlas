import * as SwitchPrimitive from "@radix-ui/react-switch";
import type { ComponentProps } from "react";
export function Switch(props: ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root className="ui-switch" {...props}>
      <SwitchPrimitive.Thumb className="ui-switch-thumb" />
    </SwitchPrimitive.Root>
  );
}
