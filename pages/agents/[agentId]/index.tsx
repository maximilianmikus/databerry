import ChevronRightRoundedIcon from '@mui/icons-material/ChevronRightRounded';
import DeleteIcon from '@mui/icons-material/Delete';
import HomeRoundedIcon from '@mui/icons-material/HomeRounded';
import {
  Alert,
  Box,
  Breadcrumbs,
  Button,
  Chip,
  ColorPaletteProp,
  Divider,
  FormControl,
  FormLabel,
  Stack,
  Typography,
} from '@mui/joy';
import { DatastoreVisibility, Prisma } from '@prisma/client';
import axios from 'axios';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { GetServerSidePropsContext } from 'next/types';
import { ReactElement } from 'react';
import * as React from 'react';
import useSWR from 'swr';

import AgentForm from '@app/components/AgentForm';
import Layout from '@app/components/Layout';
import useStateReducer from '@app/hooks/useStateReducer';
import { getAgent } from '@app/pages/api/agents/[id]';
import { BulkDeleteDatasourcesSchema } from '@app/pages/api/datasources/bulk-delete';
import { RouteNames, ToolType } from '@app/types';
import getRootDomain from '@app/utils/get-root-domain';
import { fetcher } from '@app/utils/swr-fetcher';
import { withAuth } from '@app/utils/withAuth';

const CreateDatasourceModal = dynamic(
  () => import('@app/components/CreateDatasourceModal'),
  {
    ssr: false,
  }
);

export default function AgentPage() {
  const router = useRouter();
  const [state, setState] = useStateReducer({
    currentDatastoreId: undefined as string | undefined,
  });

  const getAgentQuery = useSWR<Prisma.PromiseReturnType<typeof getAgent>>(
    `/api/agents/${router.query?.agentId}`,
    fetcher
  );

  // const getApiKeysQuery = useSWR<Prisma.PromiseReturnType<typeof getApiKeys>>(
  //   `/api/datastores/${router.query?.datastoreId}/api-keys`,
  //   fetcher
  // );

  const handleDeleteDatastore = async () => {
    if (
      window.confirm(
        'Are you sure you want to delete this datastore? This action is irreversible.'
      )
    ) {
      await axios.delete(`/api/datastores/${getAgentQuery?.data?.id}`);

      router.push(RouteNames.DATASTORES);
    }
  };

  const handleCreatApiKey = async () => {
    await axios.post(`/api/datastores/${getAgentQuery?.data?.id}/api-keys`);

    getAgentQuery.mutate();
  };

  const handleDeleteApiKey = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this api key?')) {
      await axios.delete(
        `/api/datastores/${getAgentQuery?.data?.id}/api-keys`,
        {
          data: {
            apiKeyId: id,
          },
        }
      );

      getAgentQuery.mutate();
    }
  };

  const handleBulkDelete = async (datasourceIds: string[]) => {
    if (window.confirm('Are you sure you want to delete these datasources?')) {
      await axios.post('/api/datasources/bulk-delete', {
        ids: datasourceIds,
        datastoreId: getAgentQuery?.data?.id,
      } as BulkDeleteDatasourcesSchema);

      await getAgentQuery.mutate();
    }
  };

  // React.useEffect(() => {
  //   if (!router.query.tab) {
  //     handleChangeTab('datasources');
  //   }
  // }, [router.query.tab]);

  if (!getAgentQuery?.data) {
    return null;
  }

  const agent = getAgentQuery?.data;

  return (
    <Box
      component="main"
      className="MainContent"
      sx={(theme) => ({
        px: {
          xs: 2,
          md: 6,
        },
        pt: {
          // xs: `calc(${theme.spacing(2)} + var(--Header-height))`,
          // sm: `calc(${theme.spacing(2)} + var(--Header-height))`,
          // md: 3,
        },
        pb: {
          xs: 2,
          sm: 2,
          md: 3,
        },
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        minWidth: 0,
        // height: '100dvh',
        width: '100%',
        gap: 1,
      })}
    >
      <>
        <Breadcrumbs
          size="sm"
          aria-label="breadcrumbs"
          separator={<ChevronRightRoundedIcon />}
          sx={{
            '--Breadcrumbs-gap': '1rem',
            '--Icon-fontSize': '16px',
            fontWeight: 'lg',
            color: 'neutral.400',
            px: 0,
          }}
        >
          <Link href={RouteNames.HOME}>
            <HomeRoundedIcon />
          </Link>
          <Link href={RouteNames.AGENTS}>
            <Typography
              fontSize="inherit"
              color="neutral"
              className="hover:underline"
            >
              Agents
            </Typography>
          </Link>

          <Typography fontSize="inherit" color="neutral">
            {getAgentQuery?.data?.name}
          </Typography>
        </Breadcrumbs>

        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            mt: 1,
            mb: 2,
            gap: 1,
            flexWrap: 'wrap',
            // '& > *': {
            //   minWidth: 'clamp(0px, (500px - 100%) * 999, 100%)',
            //   flexGrow: 1,
            // },
          }}
        >
          <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 2 }}>
            <Typography level="h1" fontSize="xl4">
              {getAgentQuery?.data?.name}
            </Typography>
            <Chip
              size="sm"
              variant="soft"
              color={
                {
                  public: 'success',
                  private: 'neutral',
                }[getAgentQuery?.data?.visibility!] as ColorPaletteProp
              }
            >
              {getAgentQuery?.data?.visibility}
            </Chip>
          </Box>
        </Box>

        <Divider sx={{ my: 4 }} />

        {
          <Box
            sx={(theme) => ({
              maxWidth: '100%',
              width: theme.breakpoints.values.md,
              mx: 'auto',
            })}
          >
            <AgentForm
              onSubmitSucces={() => getAgentQuery.mutate()}
              defaultValues={{
                ...getAgentQuery?.data,
                tools: [
                  ...agent.datastores.map((each) => ({
                    ...each,
                    type: ToolType.datastore,
                  })),
                ],
              }}
            />

            <Divider sx={{ my: 4 }} />
            {/* <FormControl sx={{ gap: 1 }}>
              <FormLabel>API Keys</FormLabel>
              <Typography level="body3">
                Use the api key to access the datastore when private
              </Typography>

              <Stack direction={'column'} gap={2} mt={2}>
                {getAgentQuery?.data?.apiKeys?.map((each) => (
                  <>
                    <Stack key={each.id} direction={'row'} gap={2}>
                      <Alert color="neutral" sx={{ width: '100%' }}>
                        {each.key}
                      </Alert>

                      <IconButton
                        color="danger"
                        variant="outlined"
                        onClick={() => handleDeleteApiKey(each.id)}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Stack>
                  </>
                ))}
              </Stack>

              <Button
                startDecorator={<AddIcon />}
                sx={{ mt: 3, ml: 'auto' }}
                variant="outlined"
                onClick={handleCreatApiKey}
              >
                Create API Key
              </Button>
            </FormControl>

            <Divider sx={{ my: 4 }} />

            <FormControl sx={{ gap: 1 }}>
              <FormLabel>API Endpoints</FormLabel>
              <Typography level="body3">
                Here are the endpoints to interact with the datastore
              </Typography>

              <Stack gap={2}>
                <Stack gap={2} mt={2}>
                  <Typography level="body2">Query</Typography>
                  <Typography level="body3">
                    Retrieve data from the datastore
                  </Typography>
                  <Alert color="neutral" sx={{ width: '100%' }}>
                    <Typography whiteSpace={'pre-wrap'}>
                      {`curl -X POST ${`${process.env
                        .NEXT_PUBLIC_DASHBOARD_URL!}/query/${
                        getAgentQuery?.data?.id
                      } \\`}
  -H 'Content-Type: application/json' \\
  -H 'Authorization: Bearer ${
    getAgentQuery?.data?.apiKeys?.[0]?.key || 'DATASTORE_API_KEY'
  }' \\
  -d '${JSON.stringify({
    query: 'What are the top 3 post on hacker news?',
    topK: 3,
    // filter: {
    //   tags: ['a', 'b', 'c'],
    // },
  })}'`}
                      {`\n
# Response
${JSON.stringify(
  {
    results: [
      {
        text: 'lorem ipsum dolor sit...',
        score: 0.9,
        source: 'https://example.com',
      },
    ],
  },
  null,
  4
)}
\n`}
                    </Typography>
                  </Alert>
                </Stack>
                <Stack gap={2} mt={2}>
                  <Typography level="body2">Upsert</Typography>
                  <Typography level="body3">
                    Add documents to the datastore
                  </Typography>

                  <Alert color="neutral" sx={{ width: '100%' }}>
                    <Typography whiteSpace={'pre-wrap'}>
                      {`curl -X POST ${`${process.env
                        .NEXT_PUBLIC_DASHBOARD_URL!}/upsert/${
                        getAgentQuery?.data?.id
                      } \\`}
  -H 'Content-Type: application/json' \\
  -H 'Authorization: Bearer ${
    getAgentQuery?.data?.apiKeys?.[0]?.key || 'DATASTORE_API_KEY'
  }' \\
  -d '${JSON.stringify(
    {
      documents: [
        {
          name: 'My Document Name',
          text: 'lorem ipsum dolor sit...',
          metadata: {
            source: 'https://example.com',
          },
        },
        {
          name: 'Another Document Name',
          text: 'lorem ipsum dolor sit...',
          metadata: {
            source: 'https://example2.com',
          },
        },
      ],
    },
    null,
    4
  )}'`}
                      {`\n
# Response
${JSON.stringify(
  {
    ids: ['docID1', 'docID2'],
  },
  null,
  4
)}
\n`}
                    </Typography>
                  </Alert>
                </Stack>
                <Stack gap={2} mt={2}>
                  <Typography level="body2">Update</Typography>
                  <Typography level="body3">
                    Update a document in the datastore
                  </Typography>
                  <Alert color="neutral" sx={{ width: '100%' }}>
                    <Typography whiteSpace={'pre-wrap'}>
                      {`curl -X POST ${`${process.env
                        .NEXT_PUBLIC_DASHBOARD_URL!}/update/${
                        getAgentQuery?.data?.id
                      } \\`}
  -H 'Content-Type: application/json' \\
  -H 'Authorization: Bearer ${
    getAgentQuery?.data?.apiKeys?.[0]?.key || 'DATASTORE_API_KEY'
  }' \\
  -d '${JSON.stringify(
    {
      id: 'docID1',
      name: 'My Document Name',
      text: 'lorem ipsum dolor sit...',
      metadata: {
        source: 'https://example.com',
      },
    },
    null,
    4
  )}'`}
                      {`\n
# Response
${JSON.stringify(
  {
    id: 'docID1',
  },
  null,
  4
)}
\n`}
                    </Typography>
                  </Alert>
                </Stack>
              </Stack>
            </FormControl> */}

            <Divider sx={{ my: 4 }} />

            <FormControl sx={{ gap: 1 }}>
              <FormLabel>ChatGPT Plugin</FormLabel>
              <Typography level="body3">
                Configuration files for the ChatGPT Plugin are generated
                automatically
              </Typography>

              <Stack>
                <Stack gap={2} mt={2}>
                  <Typography level="body2">ai-plugin.json</Typography>
                  <Alert color="neutral" sx={{ width: '100%' }}>
                    {`https://${getAgentQuery?.data?.id}.${getRootDomain(
                      process.env.NEXT_PUBLIC_DASHBOARD_URL!
                    )}/.well-known/ai-plugin.json`}
                  </Alert>
                </Stack>
                <Stack gap={2} mt={2}>
                  <Typography level="body2">openapi.yaml</Typography>
                  <Alert color="neutral" sx={{ width: '100%' }}>
                    {`https://${getAgentQuery?.data?.id}.${getRootDomain(
                      process.env.NEXT_PUBLIC_DASHBOARD_URL!
                    )}/.well-known/openapi.yaml`}
                  </Alert>
                </Stack>
              </Stack>
            </FormControl>

            <Divider sx={{ my: 4 }} />

            <FormControl sx={{ gap: 1 }}>
              <FormLabel>Delete Datastore</FormLabel>
              <Typography level="body3">
                It will delete the datastore and all its datasources
              </Typography>
              <Button
                color="danger"
                sx={{ mr: 'auto', mt: 2 }}
                startDecorator={<DeleteIcon />}
                onClick={handleDeleteDatastore}
              >
                Delete
              </Button>
            </FormControl>
          </Box>
        }
      </>
    </Box>
  );
}

AgentPage.getLayout = function getLayout(page: ReactElement) {
  return <Layout>{page}</Layout>;
};

export const getServerSideProps = withAuth(
  async (ctx: GetServerSidePropsContext) => {
    return {
      props: {},
    };
  }
);
