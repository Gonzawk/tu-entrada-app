export type ArgentinaPhoneNormalizationResult =
  | {
      isValid: true;
      nationalNumber: string;
      e164: string;
      display: string;
    }
  | {
      isValid: false;
      error: string;
    };

export function normalizeArgentinaMobile(
  input: string,
): ArgentinaPhoneNormalizationResult {
  let digits = input.replace(/\D/g, "");

  if (!digits) {
    return {
      isValid: false,
      error: "Ingresá tu número de celular.",
    };
  }

  // Quitar prefijo internacional argentino.
  if (digits.startsWith("54")) {
    digits = digits.slice(2);
  }

  // Quitar el 9 internacional usado para celulares.
  if (digits.startsWith("9") && digits.length === 11) {
    digits = digits.slice(1);
  }

  // Quitar 0 utilizado en llamadas nacionales.
  if (digits.startsWith("0")) {
    digits = digits.slice(1);
  }

  /*
   * Compatibilidad básica con números escritos con 15.
   * Ejemplo: 03832 15 406542.
   *
   * Debido a que la posición del 15 cambia según la longitud
   * del código de área, conviene permitirlo solo cuando podamos
   * terminar obteniendo exactamente 10 dígitos.
   */
  if (digits.length === 12 && digits.includes("15")) {
    const candidates: string[] = [];

    for (let index = 2; index <= 5; index += 1) {
      if (digits.slice(index, index + 2) === "15") {
        candidates.push(
          `${digits.slice(0, index)}${digits.slice(index + 2)}`,
        );
      }
    }

    const validCandidate = candidates.find(
      (candidate) => candidate.length === 10,
    );

    if (validCandidate) {
      digits = validCandidate;
    }
  }

  if (!/^\d{10}$/.test(digits)) {
    return {
      isValid: false,
      error:
        "Ingresá característica y número sin 0 ni 15. Deben ser 10 dígitos.",
    };
  }

  return {
    isValid: true,
    nationalNumber: digits,
    e164: `+549${digits}`,
    display: `+54 9 ${digits}`,
  };
}