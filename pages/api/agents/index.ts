import { AgentVisibility } from '@prisma/client';
import { NextApiResponse } from 'next';

import { AppNextApiRequest } from '@app/types';
import { UpsertAgentSchema } from '@app/types/dtos';
import { createAuthApiHandler, respond } from '@app/utils/createa-api-handler';
import cuid from '@app/utils/cuid';
import generateFunId from '@app/utils/generate-fun-id';
import prisma from '@app/utils/prisma-client';
import validate from '@app/utils/validate';

const handler = createAuthApiHandler();

export const getAgents = async (
  req: AppNextApiRequest,
  res: NextApiResponse
) => {
  const session = req.session;

  const agents = await prisma.agent.findMany({
    where: {
      ownerId: session?.user?.id,
    },
    include: {
      datastores: {
        select: {
          id: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  return agents;
};

handler.get(respond(getAgents));

export const upsertAgent = async (
  req: AppNextApiRequest,
  res: NextApiResponse
) => {
  const data = req.body as UpsertAgentSchema;
  const session = req.session;

  let existingAgent;
  if (data?.id) {
    existingAgent = await prisma.agent.findUnique({
      where: {
        id: data.id,
      },
      include: {
        datastores: {
          select: {
            id: true,
          },
        },
      },
    });

    if (existingAgent?.ownerId !== session?.user?.id) {
      throw new Error('Unauthorized');
    }
  }

  const id = data?.id || cuid();

  const currentDatastores = existingAgent?.datastores || [];

  const newDatastores = (data?.tools || [])
    .filter((tool) => !currentDatastores.find((one) => one.id === tool.id))
    .map((each) => ({ id: each.id }));
  const removedDatastores = currentDatastores
    .filter((tool) => !data.tools.find((one) => one.id === tool.id))
    .map((each) => ({ id: each.id }));

  const agent = await prisma.agent.upsert({
    where: {
      id,
    },
    create: {
      id,
      name: data.name || generateFunId(),
      description: data.description,
      owner: {
        connect: {
          id: session?.user?.id,
        },
      },
      visibility: data.visibility || AgentVisibility.private,
      datastores: {
        connect: newDatastores.map((tool) => ({
          id: tool.id,
        })),
      },
      // tools: {
      //   createMany: {
      //     data: data.tools.map((tool) => ({
      //       type: tool.type,
      //       ...(tool.type === ToolType.datastore
      //         ? {
      //             datastoreId: tool.id,
      //           }
      //         : {}),
      //     })),
      //   },
      // },
    },
    update: {
      name: data.name || generateFunId(),
      description: data.description,
      visibility: data.visibility || AgentVisibility.private,
      datastores: {
        connect: newDatastores,
        disconnect: removedDatastores,
      },
      // tools: {
      //   createMany: {
      //     data: newDatastores.map((tool) => ({
      //       type: tool.type,
      //       ...(tool.type === ToolType.datastore
      //         ? {
      //             datastoreId: tool.id,
      //           }
      //         : {}),
      //     })),
      //   },
      //   deleteMany: removedDatastores,
      // },
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

  return agent;
};

handler.post(
  validate({
    body: UpsertAgentSchema,
    handler: respond(upsertAgent),
  })
);

export default handler;
