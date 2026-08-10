import { describe, expect, it, vi } from 'vitest';
import { deleteAccountData } from './delete-account';

const USER_ID = 'user-abc-123';

type MockFile = { name: string };

function makeFile(name: string): MockFile {
  return { name };
}

function createMockServiceClient(options: {
  listPages?: Array<{ data: MockFile[] | null; error: { message: string } | null }>;
  removeError?: { message: string } | null;
  rpcError?: { message: string } | null;
  deleteUserError?: { message: string } | null;
}) {
  const callOrder: string[] = [];

  const list = vi.fn(async (_userId: string, opts?: { limit?: number; offset?: number }) => {
    callOrder.push(`storage.list:${opts?.offset ?? 0}`);
    const pageIndex = (opts?.offset ?? 0) / 100;
    const page = options.listPages?.[pageIndex];
    if (!page) {
      return { data: [], error: null };
    }
    return { data: page.data, error: page.error };
  });

  const remove = vi.fn(async (_paths: string[]) => {
    callOrder.push('storage.remove');
    return { error: options.removeError ?? null };
  });

  const from = vi.fn((bucket: string) => {
    if (bucket !== 'ugc-photos') {
      throw new Error(`unexpected bucket ${bucket}`);
    }
    return { list, remove };
  });

  const rpc = vi.fn(async () => {
    callOrder.push('rpc');
    return { error: options.rpcError ?? null };
  });

  const deleteUser = vi.fn(async () => {
    callOrder.push('auth.admin.deleteUser');
    return { error: options.deleteUserError ?? null };
  });

  const serviceClient = {
    storage: { from },
    rpc,
    auth: { admin: { deleteUser } },
  };

  return { serviceClient: serviceClient as never, callOrder, list, remove, rpc, deleteUser };
}

describe('deleteAccountData', () => {
  it('happy path — storage list/remove, then rpc, then admin.deleteUser in order', async () => {
    const { serviceClient, callOrder, remove, rpc, deleteUser } = createMockServiceClient({
      listPages: [{ data: [makeFile('a.jpg'), makeFile('b.jpg')], error: null }],
    });

    const result = await deleteAccountData(serviceClient, USER_ID);

    expect(result.error).toBeNull();
    expect(remove).toHaveBeenCalledOnce();
    expect(remove).toHaveBeenCalledWith([`${USER_ID}/a.jpg`, `${USER_ID}/b.jpg`]);
    expect(rpc).toHaveBeenCalledWith('delete_account_data', { target_user_id: USER_ID });
    expect(deleteUser).toHaveBeenCalledWith(USER_ID);
    expect(callOrder).toEqual([
      'storage.list:0',
      'storage.remove',
      'rpc',
      'auth.admin.deleteUser',
    ]);
  });

  it('zero storage files — skip remove, still run rpc and admin.deleteUser', async () => {
    const { serviceClient, callOrder, remove, rpc, deleteUser } = createMockServiceClient({
      listPages: [{ data: [], error: null }],
    });

    const result = await deleteAccountData(serviceClient, USER_ID);

    expect(result.error).toBeNull();
    expect(remove).not.toHaveBeenCalled();
    expect(rpc).toHaveBeenCalledOnce();
    expect(deleteUser).toHaveBeenCalledOnce();
    expect(callOrder).toEqual(['storage.list:0', 'rpc', 'auth.admin.deleteUser']);
  });

  it('paginated storage list — accumulates all pages into one remove call', async () => {
    const page1 = Array.from({ length: 100 }, (_, i) => makeFile(`p1-${i}.jpg`));
    const page2 = [makeFile('extra.jpg')];

    const { serviceClient, callOrder, list, remove } = createMockServiceClient({
      listPages: [
        { data: page1, error: null },
        { data: page2, error: null },
      ],
    });

    const result = await deleteAccountData(serviceClient, USER_ID);

    expect(result.error).toBeNull();
    expect(list).toHaveBeenCalledTimes(2);
    expect(list).toHaveBeenNthCalledWith(1, USER_ID, { limit: 100, offset: 0 });
    expect(list).toHaveBeenNthCalledWith(2, USER_ID, { limit: 100, offset: 100 });
    expect(remove).toHaveBeenCalledOnce();
    expect(remove.mock.calls[0][0]).toHaveLength(101);
    expect(remove.mock.calls[0][0]).toContain(`${USER_ID}/extra.jpg`);
    expect(callOrder.indexOf('storage.remove')).toBeLessThan(callOrder.indexOf('rpc'));
  });

  it('storage list error — short-circuits before rpc and admin.deleteUser', async () => {
    const { serviceClient, callOrder, remove, rpc, deleteUser } = createMockServiceClient({
      listPages: [{ data: null, error: { message: 'list failed' } }],
    });

    const result = await deleteAccountData(serviceClient, USER_ID);

    expect(result.error).toBe('list failed');
    expect(remove).not.toHaveBeenCalled();
    expect(rpc).not.toHaveBeenCalled();
    expect(deleteUser).not.toHaveBeenCalled();
    expect(callOrder).toEqual(['storage.list:0']);
  });

  it('rpc error — short-circuits before admin.deleteUser', async () => {
    const { serviceClient, callOrder, deleteUser } = createMockServiceClient({
      listPages: [{ data: [], error: null }],
      rpcError: { message: 'rpc failed' },
    });

    const result = await deleteAccountData(serviceClient, USER_ID);

    expect(result.error).toBe('rpc failed');
    expect(deleteUser).not.toHaveBeenCalled();
    expect(callOrder).toEqual(['storage.list:0', 'rpc']);
  });

  it('admin.deleteUser error — returns error after storage and rpc succeed', async () => {
    const { serviceClient, callOrder } = createMockServiceClient({
      listPages: [{ data: [makeFile('x.jpg')], error: null }],
      deleteUserError: { message: 'auth delete failed' },
    });

    const result = await deleteAccountData(serviceClient, USER_ID);

    expect(result.error).toBe('auth delete failed');
    expect(callOrder).toEqual([
      'storage.list:0',
      'storage.remove',
      'rpc',
      'auth.admin.deleteUser',
    ]);
  });

  it('all steps succeed — returns { error: null }', async () => {
    const { serviceClient } = createMockServiceClient({
      listPages: [{ data: [makeFile('only.jpg')], error: null }],
    });

    const result = await deleteAccountData(serviceClient, USER_ID);

    expect(result).toEqual({ error: null });
  });
});
