import axios from 'axios';
import { FileRecord } from './types';

const BASE_URL = 'http://localhost:8000';

const api = axios.create({ baseURL: BASE_URL });

export interface AuthResponse {
  uid: string;
  lastHead: number;
}

export interface UserResponse {
  uid: string;
  email: string;
  lastHead: number;
  createdAt: string;
}

export async function authLogin(email: string, password: string): Promise<AuthResponse> {
  const res = await api.post('/auth', { action: 'login', email, password });
  return res.data;
}

export async function authRegister(email: string, password: string): Promise<AuthResponse> {
  const res = await api.post('/auth', { action: 'register', email, password });
  return res.data;
}

export async function getUser(uid: string, setHead?: number): Promise<UserResponse> {
  const params: Record<string, string | number> = { uid };
  if (setHead !== undefined) params.set_head = setHead;
  const res = await api.get('/user', { params });
  return res.data;
}

export async function getFiles(uid: string): Promise<FileRecord[]> {
  const res = await api.get('/files', { params: { uid } });
  return res.data;
}

export async function createFile(payload: {
  uid: string;
  filename: string;
  path: string;
  size: number;
  start: number;
  end: number;
}): Promise<FileRecord> {
  const res = await api.post('/file', payload);
  return res.data;
}

export async function deleteFile(
  uid: string,
  filename: string,
): Promise<{ success: boolean; deletedFile: FileRecord }> {
  const res = await api.delete('/file', { params: { uid, filename } });
  return res.data;
}
