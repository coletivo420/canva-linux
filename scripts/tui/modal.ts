import blessed from "blessed";
import { tuiTheme } from "./theme";

export type ConfirmOptions = {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  dangerous?: boolean;
};

export type InputDialogResult =
  | { status: "submitted"; value: string }
  | { status: "canceled" }
  | { status: "timeout" };

function createModalShell(
  screen: blessed.Widgets.Screen,
  title: string,
  dangerous = false,
) {
  const overlay = blessed.box({
    parent: screen,
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    style: {
      bg: tuiTheme.colors.background,
      transparent: true,
    },
  });

  const modal = blessed.box({
    parent: overlay,
    top: "center",
    left: "center",
    width: "70%",
    height: 11,
    border: "line",
    tags: true,
    label: dangerous
      ? `{${tuiTheme.colors.error}-fg}${title}{/${tuiTheme.colors.error}-fg}`
      : `{${tuiTheme.colors.lightBlue}-fg}${title}{/${tuiTheme.colors.lightBlue}-fg}`,
    style: {
      fg: tuiTheme.modal.text,
      bg: tuiTheme.modal.background,
      border: {
        fg: dangerous
          ? tuiTheme.modal.dangerousBorder
          : tuiTheme.modal.normalBorder,
      },
    },
  });

  return { overlay, modal };
}

export function confirmDialog(
  screen: blessed.Widgets.Screen,
  options: ConfirmOptions,
): Promise<boolean> {
  return new Promise((resolve) => {
    const previousFocus = screen.focused;
    const { overlay, modal } = createModalShell(
      screen,
      options.title,
      options.dangerous,
    );

    const message = blessed.box({
      parent: modal,
      top: 1,
      left: 2,
      right: 2,
      height: 5,
      tags: true,
      content: options.message,
    });

    const footer = blessed.box({
      parent: modal,
      bottom: 1,
      left: 2,
      right: 2,
      height: 1,
      tags: true,
      content: [
        `{${tuiTheme.colors.lightBlue}-fg}[y/Enter]{/${tuiTheme.colors.lightBlue}-fg} ${options.confirmLabel ?? "Confirm"}`,
        `    `,
        `{${tuiTheme.colors.lightBlue}-fg}[Esc/n]{/${tuiTheme.colors.lightBlue}-fg} ${options.cancelLabel ?? "Cancel"}`,
      ].join(""),
    });

    const close = (confirmed: boolean) => {
      message.destroy();
      footer.destroy();
      modal.destroy();
      overlay.destroy();
      if (previousFocus && typeof previousFocus.focus === "function") {
        previousFocus.focus();
      }
      screen.render();
      resolve(confirmed);
    };

    overlay.key(["enter", "y"], () => {
      close(true);
    });
    overlay.key(["escape", "n"], () => {
      close(false);
    });

    overlay.on("click", () => {
      overlay.focus();
    });
    modal.on("click", () => {
      overlay.focus();
    });

    overlay.focus();
    screen.render();
  });
}

export async function messageDialog(
  screen: blessed.Widgets.Screen,
  title: string,
  message: string,
): Promise<void> {
  await confirmDialog(screen, {
    title,
    message,
    confirmLabel: "OK",
    cancelLabel: "Close",
  });
}

export async function errorDialog(
  screen: blessed.Widgets.Screen,
  title: string,
  message: string,
): Promise<void> {
  await confirmDialog(screen, {
    title,
    message,
    confirmLabel: "OK",
    cancelLabel: "Close",
    dangerous: true,
  });
}

export function inputDialog(
  screen: blessed.Widgets.Screen,
  title: string,
  prompt: string,
  timeoutMs = 30000,
): Promise<InputDialogResult> {
  return new Promise((resolve) => {
    const previousFocus = screen.focused;
    const { overlay, modal } = createModalShell(screen, title, false);

    const label = blessed.box({
      parent: modal,
      top: 1,
      left: 2,
      right: 2,
      height: 2,
      content: prompt,
    });

    const input = blessed.textbox({
      parent: modal,
      top: 4,
      left: 2,
      right: 2,
      height: 3,
      border: "line",
      inputOnFocus: true,
      censor: true,
    });

    const footer = blessed.box({
      parent: modal,
      bottom: 1,
      left: 2,
      right: 2,
      height: 1,
      tags: true,
      content: [
        `{${tuiTheme.colors.lightBlue}-fg}[Enter]{/${tuiTheme.colors.lightBlue}-fg} Submit`,
        `  `,
        `{${tuiTheme.colors.lightBlue}-fg}[Esc]{/${tuiTheme.colors.lightBlue}-fg} Cancel`,
      ].join(""),
    });

    let timer: NodeJS.Timeout | null = setTimeout(() => {
      close({
        status: "timeout",
      });
    }, timeoutMs);

    const close = (result: InputDialogResult) => {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      label.destroy();
      input.destroy();
      footer.destroy();
      modal.destroy();
      overlay.destroy();
      if (previousFocus && typeof previousFocus.focus === "function") {
        previousFocus.focus();
      }
      screen.render();
      resolve(result);
    };

    overlay.key(["escape"], () => {
      close({
        status: "canceled",
      });
    });

    input.key(["enter"], () => {
      input.submit();
    });

    input.on("submit", (value) => {
      close({
        status: "submitted",
        value: String(value ?? ""),
      });
    });

    overlay.focus();
    input.focus();
    input.readInput();
    screen.render();
  });
}
