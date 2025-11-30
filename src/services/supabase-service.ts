import { supabase } from '../lib/supabase';
import type { User, Group, GroupMember, Expense, ExpenseSplit, UserBalance } from '../types';

// Note: Using explicit type assertions due to Supabase SDK type inference limitations
// See KNOWN_ISSUES.md for details

export const userService = {
  async createUser(email: string, name: string, id: string): Promise<User> {
    const { data, error } = await supabase
      .from('users')
      .insert({ id, email, name } as unknown as never)
      .select()
      .single();

    if (error) throw error;
    return data as User;
  },

  async getUserById(id: string): Promise<User | null> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    return data as User | null;
  },

  async getUserByEmail(email: string): Promise<User | null> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .maybeSingle();

    if (error) throw error;
    return data as User | null;
  },

  async searchUsersByEmail(email: string): Promise<User[]> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .ilike('email', `%${email}%`)
      .limit(10);

    if (error) throw error;
    return (data || []) as User[];
  },
};

export const groupService = {
  async createGroup(name: string, createdBy: string): Promise<Group> {
    const { data, error } = await supabase
      .from('groups')
      .insert({ name, created_by: createdBy } as unknown as never)
      .select()
      .single();

    if (error) throw error;
    const group = data as Group;

    await supabase
      .from('group_members')
      .insert({ group_id: group.id, user_id: createdBy } as unknown as never);

    return group;
  },

  async getUserGroups(userId: string): Promise<Group[]> {
    const { data, error } = await supabase
      .from('group_members')
      .select('group_id, groups(id, name, created_by, created_at)')
      .eq('user_id', userId);

    if (error) throw error;

    return data?.map((item: { groups: Group | null }) => item.groups).filter((g): g is Group => g !== null) || [];
  },

  async getGroupById(groupId: string): Promise<Group | null> {
    const { data, error } = await supabase
      .from('groups')
      .select('*')
      .eq('id', groupId)
      .maybeSingle();

    if (error) throw error;
    return data as Group | null;
  },

  async updateGroup(groupId: string, name: string): Promise<Group> {
    const { data, error } = await supabase
      .from('groups')
      .update({ name } as unknown as never)
      .eq('id', groupId)
      .select()
      .single();

    if (error) throw error;
    return data as Group;
  },

  async deleteGroup(groupId: string): Promise<void> {
    const { error } = await supabase
      .from('groups')
      .delete()
      .eq('id', groupId);

    if (error) throw error;
  },

  async addMember(groupId: string, userId: string): Promise<GroupMember> {
    const { data, error } = await supabase
      .from('group_members')
      .insert({ group_id: groupId, user_id: userId } as unknown as never)
      .select()
      .single();

    if (error) throw error;
    return data as GroupMember;
  },

  async removeMember(groupId: string, userId: string): Promise<void> {
    const { error } = await supabase
      .from('group_members')
      .delete()
      .eq('group_id', groupId)
      .eq('user_id', userId);

    if (error) throw error;
  },

  async getGroupMembers(groupId: string): Promise<GroupMember[]> {
    const { data, error } = await supabase
      .from('group_members')
      .select('*, user:users(*)')
      .eq('group_id', groupId);

    if (error) throw error;
    return (data || []) as GroupMember[];
  },
};

export const expenseService = {
  async createExpense(expense: {
    group_id: string;
    description: string;
    amount: number;
    category: string;
    date: string;
    paid_by: string;
    receipt_url?: string;
    input_method?: string;
  }): Promise<Expense> {
    const { data, error } = await supabase
      .from('expenses')
      .insert(expense as unknown as never)
      .select()
      .single();

    if (error) throw error;
    return data as Expense;
  },

  async createSplits(splits: { expense_id: string; user_id: string; share_amount: number }[]): Promise<ExpenseSplit[]> {
    const { data, error } = await supabase
      .from('expense_splits')
      .insert(splits as unknown as never[])
      .select();

    if (error) throw error;
    return (data || []) as ExpenseSplit[];
  },

  async getGroupExpenses(groupId: string): Promise<Expense[]> {
    const { data, error } = await supabase
      .from('expenses')
      .select('*, payer:users!expenses_paid_by_fkey(*), splits:expense_splits(*, user:users(*))')
      .eq('group_id', groupId)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []) as Expense[];
  },

  async getExpenseById(expenseId: string): Promise<Expense | null> {
    const { data, error } = await supabase
      .from('expenses')
      .select('*, payer:users!expenses_paid_by_fkey(*), splits:expense_splits(*, user:users(*))')
      .eq('id', expenseId)
      .maybeSingle();

    if (error) throw error;
    return data as Expense | null;
  },

  async updateExpense(expenseId: string, updates: Partial<Expense>): Promise<Expense> {
    const { data, error } = await supabase
      .from('expenses')
      .update(updates as unknown as never)
      .eq('id', expenseId)
      .select()
      .single();

    if (error) throw error;
    return data as Expense;
  },

  async deleteExpense(expenseId: string): Promise<void> {
    const { error } = await supabase
      .from('expenses')
      .delete()
      .eq('id', expenseId);

    if (error) throw error;
  },

  async getGroupBalances(groupId: string): Promise<UserBalance[]> {
    const { data, error } = await supabase
      .from('user_balances')
      .select('*')
      .eq('group_id', groupId);

    if (error) throw error;
    return (data || []) as UserBalance[];
  },
};
