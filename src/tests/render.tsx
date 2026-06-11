import { renderToStaticMarkup } from 'react-dom/server';

import { AppRouterContext } from 'next/dist/shared/lib/app-router-context.shared-runtime';
import type { ReactElement } from 'react';

// LiveReload calls useRouter(), which needs a mounted app router. Tests
// render inside a stub; none of its methods run during static SSR.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const stubRouter = { refresh: () => {} } as any;

export const render = (element: ReactElement): string =>
	renderToStaticMarkup(
		<AppRouterContext.Provider value={stubRouter}>
			{element}
		</AppRouterContext.Provider>
	);
