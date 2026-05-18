const tui = {
  box: require("blessed/lib/widgets/box"),
  textbox: require("blessed/lib/widgets/textbox"),
};
import { c420uiTheme } from "./theme";

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
  screen: any,
  title: string,
  dangerous = false,
) {
  const overlay = tui.box({
    parent: screen,
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    style: {
      bg: c420uiTheme.colors.background,
      transparent: true,
    },
  });

  const modal = tui.box({
    parent: overlay,
    top: "center",
    left: "center",
    width: "70%",
    height: 11,
    border: "line",
    tags: true,
    label: dangerous
      ? `{${c420uiTheme.colors.error}-fg}${title}{/${c420uiTheme.colors.error}-fg}`
      : `{${c420uiTheme.colors.lightBlue}-fg}${title}{/${c420uiTheme.colors.lightBlue}-fg}`,
    style: {
      fg: c420uiTheme.modal.text,
      bg: c420uiTheme.modal.background,
      border: {
        fg: dangerous
          ? c420uiTheme.modal.dangerousBorder
          : c420uiTheme.modal.normalBorder,
      },
    },
  });

  return { overlay, modal };
}

export function confirmDialog(
  screen: any,
  options: ConfirmOptions,
): Promise<boolean> {
  return new Promise((resolve) => {
    const previousFocus = screen.focused;
    const { overlay, modal } = createModalShell(
      screen,
      options.title,
      options.dangerous,
    );

    const message = tui.box({
      parent: modal,
      top: 1,
      left: 2,
      right: 2,
      height: 5,
      tags: true,
      content: options.message,
    });

    const footer = tui.box({
      parent: modal,
      bottom: 1,
      left: 2,
      right: 2,
      height: 1,
      tags: true,
      content: [
        `{${c420uiTheme.colors.lightBlue}-fg}[y/Enter]{/${c420uiTheme.colors.lightBlue}-fg} ${options.confirmLabel ?? "Confirm"}`,
        `    `,
        `{${c420uiTheme.colors.lightBlue}-fg}[Esc/n]{/${c420uiTheme.colors.lightBlue}-fg} ${options.cancelLabel ?? "Cancel"}`,
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
  screen: any,
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
  screen: any,
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
  screen: any,
  title: string,
  prompt: string,
  timeoutMs = 30000,
): Promise<InputDialogResult> {
  return new Promise((resolve) => {
    const previousFocus = screen.focused;
    const { overlay, modal } = createModalShell(screen, title, false);

    const label = tui.box({
      parent: modal,
      top: 1,
      left: 2,
      right: 2,
      height: 2,
      content: prompt,
    });

    const input = tui.textbox({
      parent: modal,
      top: 4,
      left: 2,
      right: 2,
      height: 3,
      border: "line",
      inputOnFocus: true,
      censor: true,
    });

    const footer = tui.box({
      parent: modal,
      bottom: 1,
      left: 2,
      right: 2,
      height: 1,
      tags: true,
      content: [
        `{${c420uiTheme.colors.lightBlue}-fg}[Enter]{/${c420uiTheme.colors.lightBlue}-fg} Submit`,
        `  `,
        `{${c420uiTheme.colors.lightBlue}-fg}[Esc]{/${c420uiTheme.colors.lightBlue}-fg} Cancel`,
      ].join(""),
    });

    let timer: NodeJS.Timeout | null = null;
    let closed = false;

    const close = (result: InputDialogResult) => {
      if (closed) {
        return;
      }

      closed = true;

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

    timer = setTimeout(() => {
      close({
        status: "timeout",
      });
    }, timeoutMs);

    overlay.key(["escape"], () => {
      close({
        status: "canceled",
      });
    });

    input.key(["enter"], () => {
      input.submit();
    });

    input.key(["escape"], () => {
      close({
        status: "canceled",
      });
    });

    input.on("cancel", () => {
      close({
        status: "canceled",
      });
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
