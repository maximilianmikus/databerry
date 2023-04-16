import { zodResolver } from '@hookform/resolvers/zod';
import { ConstructionOutlined } from '@mui/icons-material';
import AddCircleOutlineRoundedIcon from '@mui/icons-material/AddCircleOutlineRounded';
import RemoveCircleOutlineRoundedIcon from '@mui/icons-material/RemoveCircleOutlineRounded';
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded';
import {
  Alert,
  Button,
  Checkbox,
  Chip,
  Divider,
  FormControl,
  FormLabel,
  IconButton,
  Sheet,
  Stack,
  Typography,
} from '@mui/joy';
import Textarea from '@mui/joy/Textarea';
import {
  AgentVisibility,
  AppDatasource as Datasource,
  DatasourceType,
  Prisma,
} from '@prisma/client';
import axios from 'axios';
import mime from 'mime-types';
import React, { useEffect, useState } from 'react';
import { FormProvider, useForm, useFormContext } from 'react-hook-form';
import useSWR from 'swr';
import useSWRMutation from 'swr/mutation';
import { z } from 'zod';

import Input from '@app/components/Input';
import { upsertDatasource } from '@app/pages/api/datasources';
import { getDatastores } from '@app/pages/api/datastores';
import { GenerateUploadLinkRequest } from '@app/pages/api/datastores/[id]/generate-upload-link';
import { ToolType } from '@app/types';
import { UpsertAgentSchema } from '@app/types/dtos';
import cuid from '@app/utils/cuid';
import { fetcher, postFetcher } from '@app/utils/swr-fetcher';

type Props = {
  defaultValues?: UpsertAgentSchema;
  onSubmitSucces?: () => any;
};

const Tool = (props: {
  title: string;
  description: string;
  type: ToolType;
  children?: React.ReactNode;
}) => {
  return (
    <Sheet variant="outlined" sx={{ borderRadius: 10, p: 2, width: '100%' }}>
      <Stack direction={'row'} alignItems={'start'} gap={2}>
        {props.children}

        <Stack direction={'column'} gap={0}>
          <Stack direction="row" gap={2}>
            <Typography level="body1">{props.title}</Typography>
            <Chip variant="soft" size="sm" sx={{ mr: 'auto' }}>
              datastore
            </Chip>
          </Stack>
          <Typography className="truncate" level="body2">
            {props.description}
          </Typography>
        </Stack>
      </Stack>
    </Sheet>
  );
};

export default function BaseForm(props: Props) {
  const [isLoading, setIsLoading] = useState(false);
  const methods = useForm<UpsertAgentSchema>({
    resolver: zodResolver(UpsertAgentSchema),
    defaultValues: {
      ...props?.defaultValues,
    },
  });

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, defaultValues, isDirty, dirtyFields },
  } = methods;

  const getDatastoresQuery = useSWR<
    Prisma.PromiseReturnType<typeof getDatastores>
  >('/api/datastores', fetcher);

  const upsertDatasourceMutation = useSWRMutation<
    Prisma.PromiseReturnType<typeof upsertDatasource>
  >(`/api/datasources`, postFetcher<UpsertAgentSchema>);

  const onSubmit = async (values: UpsertAgentSchema) => {
    try {
      setIsLoading(true);
      console.log('values', values);
      await axios.post('/api/agents', values);
      props?.onSubmitSucces?.();
    } catch (err) {
      console.log('error', err);
    } finally {
      setIsLoading(false);
    }
  };

  const networkError = upsertDatasourceMutation.error?.message;

  const visiblity = methods.watch('visibility');
  const tools = methods.watch('tools') || [];

  console.log('validation errors', methods.formState.errors);

  return (
    <FormProvider {...methods}>
      <form
        className="flex flex-col w-full space-y-6"
        onSubmit={handleSubmit(onSubmit)}
      >
        {networkError && <Alert color="danger">{networkError}</Alert>}

        <Input
          label="Name (optional)"
          control={control as any}
          {...register('name')}
        />

        <Input
          label="Description"
          control={control as any}
          {...register('description')}
        />

        <div className="flex flex-row">
          <FormControl className="flex flex-row space-x-4">
            <Checkbox
              // {...register('visibility')}
              // defaultChecked={visiblity === AgentVisibility.public}
              checked={visiblity === AgentVisibility.public}
              onChange={(e) => {
                if (e.target.checked) {
                  methods.setValue('visibility', AgentVisibility.public);
                } else {
                  methods.setValue('visibility', AgentVisibility.private);
                }
              }}
            />
            <div className="flex flex-col">
              <FormLabel>Public</FormLabel>
              <Typography level="body3">
                When activated, your agent will be available by anyone on the
                internet.
              </Typography>
            </div>
          </FormControl>
        </div>

        {/* <FormControl>
          <FormLabel>Prompt</FormLabel>
          <Textarea maxRows={21} minRows={4} {...register('prompt')} />
        </FormControl> */}

        <FormControl>
          <FormLabel>Tools</FormLabel>
          <Typography level="body2" mb={2}>
            Datastores or external integrations your Agent can access
          </Typography>

          {tools.length === 0 && (
            <Alert
              startDecorator={<WarningAmberRoundedIcon />}
              size="sm"
              color="warning"
              variant="soft"
            >
              Agent has access to zero tool
            </Alert>
          )}

          <Stack direction={'row'} gap={1} flexWrap={'wrap'}>
            {tools.map((tool) => (
              <Tool
                key={`selected-${tool.id}`}
                title={tool.name!}
                description={tool.description!}
                type={tool.type}
              >
                <IconButton
                  variant="plain"
                  color="danger"
                  size="sm"
                  onClick={() => {
                    methods.setValue(
                      'tools',
                      tools.filter((each) => each.id !== tool.id)
                    );
                  }}
                >
                  <RemoveCircleOutlineRoundedIcon />
                </IconButton>
              </Tool>
            ))}
          </Stack>
          <Divider sx={{ my: 2 }} />
          <Stack direction={'row'} gap={1} flexWrap={'wrap'}>
            {getDatastoresQuery.data
              ?.filter((each) => !tools.find((one) => one.id === each.id))
              .map((datastore) => (
                <Tool
                  key={datastore.id}
                  title={datastore.name}
                  description={datastore.description}
                  type={ToolType.datastore}
                >
                  <IconButton
                    size="sm"
                    variant="plain"
                    color="success"
                    onClick={() => {
                      methods.setValue('tools', [
                        ...tools,
                        {
                          id: datastore.id,
                          type: ToolType.datastore,
                          name: datastore.name,
                          description: datastore.description,
                        },
                      ]);
                    }}
                  >
                    <AddCircleOutlineRoundedIcon />
                  </IconButton>
                </Tool>
              ))}
          </Stack>
        </FormControl>

        <Button
          type="submit"
          variant="soft"
          color="primary"
          loading={isLoading}
          // disabled={!methods.formState.isValid}
        >
          {'Submit'}
        </Button>
      </form>
    </FormProvider>
  );
}
