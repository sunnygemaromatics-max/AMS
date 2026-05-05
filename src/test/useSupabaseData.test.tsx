import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAssets, useCreateAsset, useUpdateAsset } from '@/hooks/useSupabaseData';
import { supabase } from '@/integrations/supabase/client';

// Mock Supabase
const mockSupabase = {
  from: jest.fn(),
};

jest.mock('@/integrations/supabase/client', () => ({
  supabase: mockSupabase,
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

describe('useSupabaseData', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('useAssets', () => {
    it('should fetch assets successfully', async () => {
      const mockAssets = [
        {
          id: '1',
          name: 'Laptop',
          status: 'available',
          employees: { name: 'John Doe', employee_code: 'E001' },
          locations: { name: 'Office A', code: 'OA' },
        },
        {
          id: '2',
          name: 'Desktop',
          status: 'allocated',
          employees: { name: 'Jane Smith', employee_code: 'E002' },
          locations: { name: 'Office B', code: 'OB' },
        },
      ];

      const mockSelect = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockReturnThis();
      const mockOrder = jest.fn().mockResolvedValue({
        data: mockAssets,
        error: null,
      });

      (supabase.from as jest.Mock).mockReturnValue({
        select: mockSelect,
        eq: mockEq,
        order: mockOrder,
      });

      const { result } = renderHook(() => useAssets(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.data).toEqual(mockAssets);
        expect(result.current.isLoading).toBe(false);
      });

      expect(supabase.from).toHaveBeenCalledWith('assets');
      expect(mockSelect).toHaveBeenCalledWith('*, employees(name, employee_code, department), locations(name, code), vendors(name), categories(name, code), departments(name, code), companies(name)');
      expect(mockEq).toHaveBeenCalledWith('is_deleted', false);
      expect(mockOrder).toHaveBeenCalledWith('bin_card_no');
    });

    it('should handle fetch error', async () => {
      const mockError = new Error('Failed to fetch assets');
      const mockSelect = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockReturnThis();
      const mockOrder = jest.fn().mockResolvedValue({
        data: null,
        error: mockError,
      });

      (supabase.from as jest.Mock).mockReturnValue({
        select: mockSelect,
        eq: mockEq,
        order: mockOrder,
      });

      const { result } = renderHook(() => useAssets(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.error).toBeDefined();
        expect(result.current.isLoading).toBe(false);
      });
    });
  });

  describe('useCreateAsset', () => {
    it('should create asset successfully', async () => {
      const mockInsert = jest.fn().mockResolvedValue({
        error: null,
      });

      (supabase.from as jest.Mock).mockReturnValue({
        insert: mockInsert,
      });

      const { result } = renderHook(() => useCreateAsset(), {
        wrapper: createWrapper(),
      });

      const newAsset = {
        name: 'Test Laptop',
        status: 'available',
        bin_card_no: 'BC001',
      };

      result.current.mutate(newAsset as any);

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(supabase.from).toHaveBeenCalledWith('assets');
      expect(mockInsert).toHaveBeenCalledWith(newAsset);
    });

    it('should handle create error', async () => {
      const mockError = new Error('Failed to create asset');
      const mockInsert = jest.fn().mockResolvedValue({
        error: mockError,
      });

      (supabase.from as jest.Mock).mockReturnValue({
        insert: mockInsert,
      });

      const { result } = renderHook(() => useCreateAsset(), {
        wrapper: createWrapper(),
      });

      const newAsset = {
        name: 'Test Laptop',
        status: 'available',
      };

      result.current.mutate(newAsset as any);

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
        expect(result.current.error).toEqual(mockError);
      });
    });
  });

  describe('useUpdateAsset', () => {
    it('should update asset successfully', async () => {
      const mockUpdate = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockResolvedValue({
        error: null,
      });

      (supabase.from as jest.Mock).mockReturnValue({
        update: mockUpdate,
        eq: mockEq,
      });

      const { result } = renderHook(() => useUpdateAsset(), {
        wrapper: createWrapper(),
      });

      const updateData = {
        id: '1',
        name: 'Updated Laptop',
        status: 'allocated',
      };

      result.current.mutate(updateData as any);

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(supabase.from).toHaveBeenCalledWith('assets');
      expect(mockUpdate).toHaveBeenCalledWith({ name: 'Updated Laptop', status: 'allocated' });
      expect(mockEq).toHaveBeenCalledWith('id', '1');
    });

    it('should handle update error', async () => {
      const mockError = new Error('Failed to update asset');
      const mockUpdate = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockResolvedValue({
        error: mockError,
      });

      (supabase.from as jest.Mock).mockReturnValue({
        update: mockUpdate,
        eq: mockEq,
      });

      const { result } = renderHook(() => useUpdateAsset(), {
        wrapper: createWrapper(),
      });

      const updateData = {
        id: '1',
        name: 'Updated Laptop',
      };

      result.current.mutate(updateData as any);

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
        expect(result.current.error).toEqual(mockError);
      });
    });
  });
});
