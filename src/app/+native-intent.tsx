export function redirectSystemPath({ path }: { path: string }) {
  try {
    const url = new URL(path);

    const host = url.hostname;
    const pathname = url.pathname;

    if (host === "payment-success") {
      const ordenId = pathname.replace("/", "");
      return `/payment-success/${ordenId}`;
    }

    if (host === "payment-failure") {
      const ordenId = pathname.replace("/", "");
      return `/payment-failure/${ordenId}`;
    }

    if (host === "payment-pending") {
      const ordenId = pathname.replace("/", "");
      return `/payment-pending/${ordenId}`;
    }

    return path;
  } catch {
    return path;
  }
}