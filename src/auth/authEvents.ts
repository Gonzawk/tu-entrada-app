type UnauthorizedHandler = () => void | Promise<void>;

let unauthorizedHandler: UnauthorizedHandler | null = null;
let handlingUnauthorized = false;

export function setUnauthorizedHandler(
  handler: UnauthorizedHandler
) {
  unauthorizedHandler = handler;
  handlingUnauthorized = false;
}

export function clearUnauthorizedHandler() {
  unauthorizedHandler = null;
  handlingUnauthorized = false;
}

export async function emitUnauthorized() {
  if (!unauthorizedHandler || handlingUnauthorized) {
    return;
  }

  handlingUnauthorized = true;

  try {
    await unauthorizedHandler();
  } catch (error) {
    if (__DEV__) {
      console.log(
        "Error procesando sesión no autorizada:",
        error
      );
    }
  }
}

export function resetUnauthorizedState() {
  handlingUnauthorized = false;
}