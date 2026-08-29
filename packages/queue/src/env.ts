export const getRabbitmqUrl = (): string => {
  const url = process.env.RABBITMQ_URL;
  if (!url) {
    throw new Error("RABBITMQ_URL is not set — copy .env.example to .env at the repo root.");
  }
  return url;
};
