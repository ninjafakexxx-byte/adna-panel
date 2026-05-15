/**
 * Notify — wrapper padronizado em cima do `sonner`.
 * Categorias: success | error | warning | info | loading | promise
 * Mantém ícones, durações e stacking consistentes em todo o sistema.
 */
import { toast as sonner, type ExternalToast } from "sonner";

const baseDurations = {
  success: 3500,
  info: 3500,
  warning: 5000,
  error: 6000,
};

type Opts = ExternalToast & { description?: string };

export const notify = {
  success(title: string, opts?: Opts) {
    return sonner.success(title, { duration: baseDurations.success, ...opts });
  },
  error(title: string, opts?: Opts) {
    return sonner.error(title, { duration: baseDurations.error, ...opts });
  },
  warning(title: string, opts?: Opts) {
    return sonner.warning(title, { duration: baseDurations.warning, ...opts });
  },
  info(title: string, opts?: Opts) {
    return sonner.info(title, { duration: baseDurations.info, ...opts });
  },
  loading(title: string, opts?: Opts) {
    return sonner.loading(title, opts);
  },
  promise<T>(
    p: Promise<T>,
    msgs: { loading: string; success: string | ((d: T) => string); error: string | ((e: any) => string) },
  ) {
    return sonner.promise(p, msgs);
  },
  dismiss(id?: string | number) {
    return sonner.dismiss(id);
  },
};
