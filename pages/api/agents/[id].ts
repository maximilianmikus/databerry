import { NextApiResponse } from 'next';

import { AppNextApiRequest } from '@app/types/index';
import { createAuthApiHandler, respond } from '@app/utils/createa-api-handler';
import prisma from '@app/utils/prisma-client';

const handler = createAuthApiHandler();

export const getAgent = async (
  req: AppNextApiRequest,
  res: NextApiResponse
) => {
  const session = req.session;
  const id = req.query.id as string;

  const agent = await prisma.agent.findUnique({
    where: {
      id,
    },
    include: {
      datastores: {
        select: {
          id: true,
          name: true,
          description: true,
        },
      },
    },
  });

  if (agent?.ownerId !== session?.user?.id) {
    throw new Error('Unauthorized');
  }

  return agent;
};

handler.get(respond(getAgent));

export default handler;
