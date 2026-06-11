import type { AddressInfo } from 'node:net';
import { createServer } from 'node:http';

export function getFreePort(): Promise<number> {
	return new Promise((resolve, reject) => {
		const s = createServer();
		s.listen(0, () => {
			const port = (s.address() as AddressInfo).port;
			s.close(error => (error ? reject(error) : resolve(port)));
		});
		s.on('error', reject);
	});
}
