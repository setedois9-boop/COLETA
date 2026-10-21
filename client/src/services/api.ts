import { FormDataCadastro, SiteConfig, Solicitacao, AdminUser, LoginResponse } from '../types';

export const API_BASE = import.meta.env.VITE_API_URL || '/api';

export function getAuthToken(): string | null {
  return localStorage.getItem('admin_token');
}

export function setAuthToken(token: string | null): void {
  if (token) {
    localStorage.setItem('admin_token', token);
  } else {
    localStorage.removeItem('admin_token');
  }
}

function authHeaders(): Record<string, string> {
  const token = getAuthToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// Helper para resolução segura de arquivos anexados com token de autorização
export function getMediaUrl(pathOrUrl?: string): string {
  if (!pathOrUrl) return '';
  if (pathOrUrl.startsWith('http://') || pathOrUrl.startsWith('https://') || pathOrUrl.startsWith('blob:') || pathOrUrl.startsWith('data:')) {
    return pathOrUrl;
  }
  const token = getAuthToken();
  const tokenParam = token ? `?token=${encodeURIComponent(token)}` : '';

  if (API_BASE.startsWith('http')) {
    const origin = new URL(API_BASE).origin;
    return `${origin}${pathOrUrl.startsWith('/') ? '' : '/'}${pathOrUrl}${tokenParam}`;
  }
  return `${pathOrUrl}${tokenParam}`;
}

export async function changeAdminPassword(senha_atual: string, nova_senha: string, two_factor_code?: string): Promise<{ success: boolean; message: string }> {
  const res = await fetch(`${API_BASE}/admin/password`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(),
    },
    body: JSON.stringify({
      senha_atual,
      nova_senha,
      two_factor_code: two_factor_code ? two_factor_code.replace(/\D/g, '') : undefined,
      code: two_factor_code ? two_factor_code.replace(/\D/g, '') : undefined,
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || 'Falha ao alterar senha.');
  }
  return data;
}

// 1. Obter configurações públicas do site
export async function fetchSiteConfig(): Promise<SiteConfig> {
  const res = await fetch(`${API_BASE}/config`, { cache: 'no-store' });
  if (!res.ok) throw new Error('Falha ao carregar configurações do site');
  return res.json();
}

// 2. Salvar configurações do site (Admin com suporte a 2FA)
export async function saveSiteConfig(
  config: Partial<SiteConfig>,
  twoFactorCode?: string
): Promise<{ success: boolean; message: string }> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...authHeaders(),
  };

  if (twoFactorCode) {
    headers['x-2fa-code'] = twoFactorCode.trim();
  }

  const payload: any = { ...config };
  if (twoFactorCode) {
    payload.two_factor_code = twoFactorCode.trim();
  }

  const res = await fetch(`${API_BASE}/config`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const error: any = new Error(err.error || 'Falha ao salvar configurações');
    error.require_2fa = Boolean(err.require_2fa);
    error.require_2fa_setup = Boolean(err.require_2fa_setup);
    error.locked = Boolean(err.locked);
    throw error;
  }
  return res.json();
}

// Reduz fotos antes do envio para respeitar o limite de corpo da requisição serverless (4,5 MB).
async function compressImage(file: File, maxSide = 1280, quality = 0.75): Promise<File> {
  if (!file.type.startsWith('image/') || file.size < 400 * 1024) return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext('2d')?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
    if (!blob || blob.size >= file.size) return file;
    return new File([blob], file.name.replace(/\.[^.]+$/, '') + '.jpg', { type: 'image/jpeg' });
  } catch {
    return file;
  }
}

// 3. Enviar solicitação de cadastro (8 etapas)
export async function submitCadastro(data: FormDataCadastro): Promise<{
  success: boolean;
  protocolo: string;
  id: number;
  nome_fantasia: string;
  criado_em: string;
}> {
  const formData = new FormData();

  // Campos de texto simples
  formData.append('cnpj', data.cnpj);
  formData.append('razao_social', data.razao_social);
  formData.append('nome_fantasia', data.nome_fantasia);
  formData.append('tipo_comercio', data.tipo_comercio);
  formData.append('tipo_comercio_outro', data.tipo_comercio_outro || '');

  formData.append('cep', data.cep);
  formData.append('estado', data.estado);
  formData.append('cidade', data.cidade);
  formData.append('bairro', data.bairro);
  formData.append('rua', data.rua);
  formData.append('numero', data.numero);
  formData.append('complemento', data.complemento || '');

  formData.append('latitude', String(data.latitude));
  formData.append('longitude', String(data.longitude));

  // JSON campos
  formData.append('dias_funcionamento', JSON.stringify(data.dias_funcionamento));
  formData.append('horarios_funcionamento', JSON.stringify(data.horarios_funcionamento));
  formData.append('fecha_almoco', String(data.fecha_almoco));
  formData.append('horario_almoco_inicio', data.horario_almoco_inicio || '');
  formData.append('horario_almoco_fim', data.horario_almoco_fim || '');

  formData.append('estacionamento', data.estacionamento);
  formData.append('quantidade_colaboradores', data.quantidade_colaboradores);
  formData.append('experiencia_logistica', data.experiencia_logistica);
  formData.append('servicos_desejados', JSON.stringify(data.servicos_desejados));

  formData.append('nome_responsavel', data.nome_responsavel);
  formData.append('telefone', data.telefone);
  formData.append('email', data.email);

  formData.append('banco_1', data.banco_1 || '');
  formData.append('agencia_1', data.agencia_1 || '');
  formData.append('conta_1', data.conta_1 || '');
  formData.append('tipo_conta_1', data.tipo_conta_1 || '');
  formData.append('pix_1', data.pix_1 || '');

  formData.append('banco_2', data.banco_2 || '');
  formData.append('agencia_2', data.agencia_2 || '');
  formData.append('conta_2', data.conta_2 || '');
  formData.append('tipo_conta_2', data.tipo_conta_2 || '');
  formData.append('pix_2', data.pix_2 || '');

  formData.append('origem_cadastro', data.origem_cadastro);
  formData.append('origem_outro', data.origem_outro || '');

  // Anexar arquivos de fotos
  if (data.foto_fachada) {
    const foto = await compressImage(data.foto_fachada);
    formData.append('foto_fachada', foto, foto.name);
  }
  if (data.foto_interior) {
    const foto = await compressImage(data.foto_interior);
    formData.append('foto_interior', foto, foto.name);
  }

  let res: Response;
  try {
    res = await fetch(`${API_BASE}/solicitacoes`, {
      method: 'POST',
      body: formData,
    });
  } catch {
    throw new Error('Não foi possível conectar ao servidor Backend (porta 3001). Verifique se o servidor está rodando.');
  }

  const json = await res.json().catch(() => ({}));

  if (!res.ok) {
    if (res.status === 429) {
      throw new Error(
        json.error || 'Uma solicitação recente para este CNPJ já foi enviada nos últimos 2 minutos. Aguarde para tentar novamente.'
      );
    }
    if (res.status === 413) {
      throw new Error('As fotos são muito grandes. Envie imagens menores e tente novamente.');
    }
    throw new Error(json.error || 'Falha ao enviar a solicitação. Tente novamente.');
  }

  return json;
}

// 4. Consulta de CEP gratuita (BrasilAPI com fallback para ViaCEP)
export async function consultarCEP(cep: string): Promise<{
  rua: string;
  bairro: string;
  cidade: string;
  estado: string;
  latitude?: number;
  longitude?: number;
} | null> {
  const limpo = cep.replace(/\D/g, '');
  if (limpo.length !== 8) return null;

  try {
    const res = await fetch(`https://brasilapi.com.br/api/cep/v2/${limpo}`);
    if (res.ok) {
      const data = await res.json();
      const coords = data.location?.coordinates;
      const lat = coords?.latitude ? parseFloat(coords.latitude) : undefined;
      const lng = coords?.longitude ? parseFloat(coords.longitude) : undefined;
      return {
        rua: data.street || '',
        bairro: data.neighborhood || '',
        cidade: data.city || '',
        estado: data.state || '',
        latitude: !isNaN(Number(lat)) ? lat : undefined,
        longitude: !isNaN(Number(lng)) ? lng : undefined,
      };
    }
  } catch (e) {
    console.warn('BrasilAPI v2 falhou, tentando fallback:', e);
  }

  try {
    const res = await fetch(`https://brasilapi.com.br/api/cep/v1/${limpo}`);
    if (res.ok) {
      const data = await res.json();
      return {
        rua: data.street || '',
        bairro: data.neighborhood || '',
        cidade: data.city || '',
        estado: data.state || '',
      };
    }
  } catch (e) {
    console.warn('BrasilAPI v1 falhou, tentando ViaCEP:', e);
  }

  try {
    const res = await fetch(`https://viacep.com.br/ws/${limpo}/json/`);
    if (res.ok) {
      const data = await res.json();
      if (!data.erro) {
        return {
          rua: data.logradouro || '',
          bairro: data.bairro || '',
          cidade: data.localidade || '',
          estado: data.uf || '',
        };
      }
    }
  } catch (e) {
    console.warn('ViaCEP falhou:', e);
  }

  return null;
}

// 5. Admin: Listar solicitações com paginação e busca
export async function fetchSolicitacoes(params: {
  q?: string;
  status?: string;
  estado?: string;
  cidade?: string;
  page?: number;
  limit?: number;
  sort_by?: string;
  sort_order?: string;
}): Promise<{
  data: Solicitacao[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}> {
  const query = new URLSearchParams();
  if (params.q) query.append('q', params.q);
  if (params.status) query.append('status', params.status);
  if (params.estado) query.append('estado', params.estado);
  if (params.cidade) query.append('cidade', params.cidade);
  if (params.page) query.append('page', String(params.page));
  if (params.limit) query.append('limit', String(params.limit));
  if (params.sort_by) query.append('sort_by', params.sort_by);
  if (params.sort_order) query.append('sort_order', params.sort_order);

  const res = await fetch(`${API_BASE}/solicitacoes?${query.toString()}`, {
    headers: { ...authHeaders() },
  });

  if (!res.ok) {
    if (res.status === 401) throw new Error('UNAUTHORIZED');
    throw new Error('Erro ao listar solicitações');
  }

  return res.json();
}

// 6. Admin: Detalhes da solicitação
export async function fetchSolicitacaoDetalhes(id: number | string, revealFinancial = false): Promise<Solicitacao> {
  const res = await fetch(`${API_BASE}/solicitacoes/${id}?reveal_financial=${revealFinancial}`, {
    headers: { ...authHeaders() },
  });

  if (!res.ok) {
    if (res.status === 401) throw new Error('UNAUTHORIZED');
    throw new Error('Erro ao buscar detalhes da solicitação');
  }

  return res.json();
}

// 7. Admin: Atualizar status e registrar histórico
export async function updateSolicitacaoStatus(id: number | string, status: string, observacao?: string): Promise<{ success: boolean; message: string }> {
  const res = await fetch(`${API_BASE}/solicitacoes/${id}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(),
    },
    body: JSON.stringify({ status, observacao }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Falha ao atualizar status');
  }

  return res.json();
}

// 8. Admin: Atualizar observações internas
export async function updateObservacoesInternas(id: number | string, observacoes_internas: string): Promise<{ success: boolean }> {
  const res = await fetch(`${API_BASE}/solicitacoes/${id}/observacoes`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(),
    },
    body: JSON.stringify({ observacoes_internas }),
  });

  if (!res.ok) throw new Error('Falha ao salvar anotação interna');
  return res.json();
}

// 9. Admin: Autenticação com suporte opcional a 2FA e estado intermediário
export async function loginAdmin(
  email: string,
  senha: string,
  two_factor_code?: string,
  pre_auth_token?: string
): Promise<LoginResponse> {
  setAuthToken(null);
  let res: Response;
  try {
    res = await fetch(`${API_BASE}/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: email ? email.trim().toLowerCase() : undefined,
        senha: senha || undefined,
        two_factor_code: two_factor_code ? two_factor_code.replace(/\D/g, '') : undefined,
        pre_auth_token: pre_auth_token || undefined,
      }),
    });
  } catch {
    throw new Error('Não foi possível conectar ao servidor Backend (porta 3001). Certifique-se de que o backend está em execução.');
  }

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 502 || res.status === 503 || res.status === 504) {
      throw new Error('Servidor backend indisponível (porta 3001). Inicie o servidor com "iniciar.bat" ou "npm run dev".');
    }
    throw new Error(json.error || 'Credenciais inválidas. Verifique seu e-mail e senha.');
  }

  if (json.token) {
    setAuthToken(json.token);
  }
  return json;
}

// 9.1 Admin: Concluir autenticação com código 2FA a partir do token intermediário
export async function verify2FALogin(
  pre_auth_token: string,
  two_factor_code: string
): Promise<LoginResponse> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}/admin/2fa/verify-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pre_auth_token,
        two_factor_code: two_factor_code.replace(/\D/g, ''),
      }),
    });
  } catch {
    throw new Error('Não foi possível conectar ao servidor Backend.');
  }

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(json.error || 'Código do Google Authenticator inválido ou expirado.');
  }

  if (json.token) {
    setAuthToken(json.token);
  }
  return json;
}

// 9.2 Admin: Logout com revogação e invalidação no backend
export async function logoutAdmin(): Promise<void> {
  try {
    const res = await fetch(`${API_BASE}/admin/logout`, {
      method: 'POST',
      headers: { ...authHeaders() },
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || 'O servidor não conseguiu invalidar a sessão.');
    }
  } finally {
    setAuthToken(null);
  }
}

export async function fetchAdminMe(): Promise<{ admin: AdminUser }> {
  const res = await fetch(`${API_BASE}/admin/me`, {
    headers: { ...authHeaders() },
  });

  if (!res.ok) throw new Error('Sessão expirada');
  return res.json();
}

// 10. Admin: Métricas do Dashboard
export async function fetchDashboardData(): Promise<{
  stats: {
    total: number;
    recebido: number;
    em_analise: number;
    aguardando_contato: number;
    documentacao_pendente: number;
    aprovado: number;
    rejeitado: number;
    ultimos_7_dias: number;
    mes_atual: number;
  };
  timeline: Array<{ data: string; label: string; quantidade: number }>;
  tipos_comercio: Array<{ tipo_comercio: string; count: number }>;
  recentes: Solicitacao[];
}> {
  const res = await fetch(`${API_BASE}/admin/dashboard`, {
    headers: { ...authHeaders() },
  });

  if (!res.ok) {
    if (res.status === 401) throw new Error('UNAUTHORIZED');
    throw new Error('Erro ao carregar estatísticas do dashboard');
  }

  return res.json();
}

// 11. Admin: Excluir solicitação (LGPD)
export async function deleteSolicitacao(id: number | string): Promise<{ success: boolean }> {
  const res = await fetch(`${API_BASE}/solicitacoes/${id}`, {
    method: 'DELETE',
    headers: { ...authHeaders() },
  });

  if (!res.ok) throw new Error('Falha ao excluir registro');
  return res.json();
}

// 12. Admin: Live-check de atualizações em tempo real (polling a cada 5s)
export async function checkLiveUpdates(lastId: number): Promise<{
  novos: Solicitacao[];
  total: number;
  hasNew: boolean;
}> {
  const res = await fetch(`${API_BASE}/admin/live-check?last_id=${lastId}`, {
    headers: { ...authHeaders() },
  });

  if (!res.ok) {
    if (res.status === 401) throw new Error('UNAUTHORIZED');
    throw new Error('Falha no live-check');
  }

  return res.json();
}

// 13. Admin: 2FA Google Authenticator
export async function fetch2FAStatus(): Promise<{ enabled: boolean; pending: boolean }> {
  const res = await fetch(`${API_BASE}/admin/2fa/status`, {
    headers: { ...authHeaders() },
  });
  if (!res.ok) throw new Error('Erro ao consultar status do 2FA');
  return res.json();
}

export async function setup2FA(): Promise<{
  secret: string;
  qr_code: string;
  otpauth_url: string;
}> {
  const res = await fetch(`${API_BASE}/admin/2fa/setup`, {
    method: 'POST',
    headers: { ...authHeaders() },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Erro ao gerar credenciais do Google Authenticator');
  }
  return res.json();
}

export async function directEnable2FA(): Promise<{ success: boolean; message: string; secret?: string }> {
  const res = await fetch(`${API_BASE}/admin/2fa/direct-enable`, {
    method: 'POST',
    headers: { ...authHeaders() },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Erro ao ativar 2FA diretamente');
  }
  return res.json();
}

export async function verifyAndEnable2FA(token: string): Promise<{ success: boolean; message: string }> {
  const res = await fetch(`${API_BASE}/admin/2fa/verify-and-enable`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(),
    },
    body: JSON.stringify({ token: token.replace(/\D/g, '') }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Código do Google Authenticator inválido ou expirado');
  }
  return res.json();
}

export async function disable2FA(senha: string, code: string): Promise<{ success: boolean; message: string }> {
  const res = await fetch(`${API_BASE}/admin/2fa/disable`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(),
    },
    body: JSON.stringify({
      senha: senha || '',
      code: code ? code.replace(/\D/g, '') : '',
      two_factor_code: code ? code.replace(/\D/g, '') : '',
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Falha ao desativar 2FA');
  }
  return res.json();
}
