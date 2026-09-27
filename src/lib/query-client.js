import { QueryClient } from '@tanstack/react-query';


export const queryClientInstance = new QueryClient({
	defaultOptions: {
		queries: {
			refetchOnWindowFocus: false,
			retry: (failureCount, error) => {
				const status = Number(
					error?.status ||
					error?.response?.status ||
					error?.data?.status ||
					0
				);
				const message = String(
					error?.response?.data?.error ||
					error?.data?.error ||
					error?.message ||
					""
				);
				if (status === 429 || /rate limit/i.test(message)) return false;
				return failureCount < 1;
			},
		},
	},
});