import { supabase } from '../lib/supabase';
import type { User, Group, GroupMember, Expense, ExpenseSplit, UserBalance } from '../types';

export const userService = {
  async createUser(email: string, name: string, id: string): Promise<User> {
    const { data, error } = await supabase
      .from('users')
      .insert({ id, email, name })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async getUserById(id: string): Promise<User | null> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  async getUserByEmail(email: string): Promise<User | null> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  async searchUsersByEmail(email: string): Promise<User[]> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .ilike('email', `%${email}%`)
      .limit(10);

    if (error) throw error;
    return data || [];
  },
};

export const groupService = {
  async createGroup(name: string, createdBy: string): Promise<Group> {
    const { data, error } = await supabase
      .from('groups')
      .insert({ name, created_by: createdBy })
      .select()
      .single();

    if (error) throw error;

    await supabase
      .from('group_members')
      .insert({ group_id: data.id, user_id: createdBy });

    return data;
  },

  async getUserGroups(userId: string): Promise<Group[]> {
    const { data, error } = await supabase
      .from('group_members')
      .select('group_id, groups(id, name, created_by, created_at)')
      .eq('user_id', userId);

    if (error) throw error;

    return data?.map((item: any) => item.groups).filter(Boolean) || [];
  },

  async getGroupById(groupId: string): Promise<Group | null> {
    const { data, error } = await supabase
      .from('groups')
      .select('*')
      .eq('id', groupId)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  async updateGroup(groupId: string, name: string): Promise<Group> {
    const { data, error } = await supabase
      .from('groups')
      .update({ name })
      .eq('id', groupId)
      .select()
      .single();

    if (error) throw error;
    return data;
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
      .insert({ group_id: groupId, user_id: userId })
      .select()
      .single();

    if (error) throw error;
    return data;
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
    return data || [];
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
      .insert(expense)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async createSplits(splits: { expense_id: string; user_id: string; share_amount: number }[]): Promise<ExpenseSplit[]> {
    const { data, error } = await supabase
      .from('expense_splits')
      .insert(splits)
      .select();

    if (error) throw error;
    return data || [];
  },

  async getGroupExpenses(groupId: string): Promise<Expense[]> {
    const { data, error } = await supabase
      .from('expenses')
      .select('*, payer:users!expenses_paid_by_fkey(*), splits:expense_splits(*, user:users(*))')
      .eq('group_id', groupId)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async getExpenseById(expenseId: string): Promise<Expense | null> {
    const { data, error } = await supabase
      .from('expenses')
      .select('*, payer:users!expenses_paid_by_fkey(*), splits:expense_splits(*, user:users(*))')
      .eq('id', expenseId)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  async updateExpense(expenseId: string, updates: Partial<Expense>): Promise<Expense> {
    const { data, error } = await supabase
      .from('expenses')
      .update(updates)
      .eq('id', expenseId)
      .select()
      .single();

    if (error) throw error;
    return data;
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
    return data || [];
  },
};
