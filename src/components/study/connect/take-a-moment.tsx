"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

/*
 * A slow, soft swell for the optional pause. It runs only when motion is on
 * (full or subtle), for a handful of breaths, then rests; with motion off the
 * circle is simply still. Nothing measures or shows how long the pause lasts.
 */
const BREATHE_KEYFRAMES =
  "@keyframes gl-connect-breathe{0%,100%{transform:scale(0.86);opacity:0.55}50%{transform:scale(1);opacity:1}}";

/** An optional, untimed pause: a still (or gently breathing) circle and a few quiet words. */
export function TakeAMoment() {
  const [open, setOpen] = useState(false);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const moveFocus = useRef(false);

  // The button that opens the pause and the pause itself replace each other, so focus follows.
  useEffect(() => {
    if (!moveFocus.current) return;
    moveFocus.current = false;
    if (open) panelRef.current?.focus();
    else toggleRef.current?.focus();
  }, [open]);

  function show() {
    moveFocus.current = true;
    setOpen(true);
  }

  function close() {
    moveFocus.current = true;
    setOpen(false);
  }

  return (
    <div className="text-center">
      <style href="gl-connect-breathe" precedence="default">
        {BREATHE_KEYFRAMES}
      </style>
      {!open && (
        <Button ref={toggleRef} variant="soft" size="lg" onClick={show}>
          Take a moment
        </Button>
      )}
      {open && (
        <div
          ref={panelRef}
          role="group"
          aria-label="A quiet moment"
          tabIndex={-1}
          className="motion-reveal flex flex-col items-center gap-6 rounded-2xl outline-none"
        >
          <div aria-hidden className="relative flex size-36 items-center justify-center sm:size-40">
            <div className="absolute inset-0 rounded-full bg-sacred-accent/10 motion-on:animate-[gl-connect-breathe_10s_ease-in-out_6]" />
            <div className="absolute inset-7 rounded-full bg-sacred-accent/15 motion-on:animate-[gl-connect-breathe_10s_ease-in-out_6]" />
            <div className="size-2.5 rounded-full bg-sacred-accent/70" />
          </div>
          <p className="max-w-xs font-serif text-lg leading-relaxed text-pretty text-sacred-fg">
            Be still. Read the verses again, or simply rest. Stay as long as you like.
          </p>
          <Button variant="ghost" size="lg" onClick={close}>
            Continue when you’re ready
          </Button>
        </div>
      )}
    </div>
  );
}
