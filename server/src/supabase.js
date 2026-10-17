import { createClient } from '@supabase/supabase-js';

let supabaseInstance = null;

export function isSupabaseConfigured() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
  return Boolean(url && key && url.trim() !== '' && key.trim() !== '');
}

export function getSupabaseClient() {
  if (!isSupabaseConfigured()) return null;
  if (!supabaseInstance) {
    const url = process.env.SUPABASE_URL.trim();
    const key = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY).trim();
    supabaseInstance = createClient(url, key, {
      auth: { persistSession: false }
    });
  }
  return supabaseInstance;
}

// Upload de foto diretamente para o Supabase Storage (bucket: arquivos_solicitacao)
export async function uploadFileToSupabase(fileBuffer, fileName, mimeType) {
  const supabase = getSupabaseClient();
  if (!supabase) return null;

  const ext = fileName.split('.').pop() || 'jpg';
  const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}.${ext}`;
  const filePath = `candidaturas/${uniqueName}`;

  try {
    const { error: uploadError } = await supabase.storage
      .from('arquivos_solicitacao')
      .upload(filePath, fileBuffer, {
        contentType: mimeType,
        upsert: true
      });

    if (uploadError) {
      console.warn('Aviso no upload Supabase Storage:', uploadError.message);
      return null;
    }

    const { data: publicUrlData } = supabase.storage
      .from('arquivos_solicitacao')
      .getPublicUrl(filePath);

    return publicUrlData?.publicUrl || filePath;
  } catch (err) {
    console.error('Erro ao conectar ao Supabase Storage:', err);
    return null;
  }
}

// Salvar solicitação no Supabase PostgreSQL
export async function saveSolicitacaoSupabase(body, files = {}) {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error('Supabase não configurado');

  const agora = new Date().toISOString();

  // 1. Inserir na tabela solicitacoes
  const { data: sol, error: solError } = await supabase
    .from('solicitacoes')
    .insert([
      {
        protocolo: body.protocolo,
        cnpj: body.cnpj,
        razao_social: body.razao_social,
        nome_fantasia: body.nome_fantasia,
        tipo_comercio: body.tipo_comercio,
        tipo_comercio_outro: body.tipo_comercio_outro || null,
        cep: body.cep,
        estado: body.estado,
        cidade: body.cidade,
        bairro: body.bairro,
        rua: body.rua,
        numero: body.numero,
        complemento: body.complemento || null,
        latitude: parseFloat(body.latitude) || -23.55052,
        longitude: parseFloat(body.longitude) || -46.633308,
        dias_funcionamento: typeof body.dias_funcionamento === 'string' ? JSON.parse(body.dias_funcionamento) : body.dias_funcionamento,
        horarios_funcionamento: typeof body.horarios_funcionamento === 'string' ? JSON.parse(body.horarios_funcionamento) : body.horarios_funcionamento,
        fecha_almoco: body.fecha_almoco === true || body.fecha_almoco === 'true' || body.fecha_almoco === 1,
        horario_almoco_inicio: body.horario_almoco_inicio || null,
        horario_almoco_fim: body.horario_almoco_fim || null,
        estacionamento: body.estacionamento || 'Não tem estacionamento',
        quantidade_colaboradores: body.quantidade_colaboradores || 'Não tem colaboradores',
        experiencia_logistica: body.experiencia_logistica || 'Não trabalhou ainda',
        servicos_desejados: typeof body.servicos_desejados === 'string' ? JSON.parse(body.servicos_desejados) : body.servicos_desejados,
        nome_responsavel: body.nome_responsavel,
        telefone: body.telefone,
        email: body.email,
        banco_1: body.banco_1 || null,
        agencia_1: body.agencia_1 || null,
        conta_1: body.conta_1 || null,
        tipo_conta_1: body.tipo_conta_1 || null,
        pix_1: body.pix_1 || null,
        banco_2: body.banco_2 || null,
        agencia_2: body.agencia_2 || null,
        conta_2: body.conta_2 || null,
        tipo_conta_2: body.tipo_conta_2 || null,
        pix_2: body.pix_2 || null,
        origem_cadastro: body.origem_cadastro || 'Outro',
        origem_outro: body.origem_outro || null,
        status: 'Recebido',
        criado_em: agora,
        atualizado_em: agora
      }
    ])
    .select()
    .single();

  if (solError) throw new Error(solError.message);

  // 2. Inserir histórico de status inicial
  await supabase.from('historico_status').insert([
    {
      solicitacao_id: sol.id,
      status_anterior: null,
      status_novo: 'Recebido',
      administrador_id: 'Sistema',
      observacao: 'Candidatura submetida pelo formulário público',
      criado_em: agora
    }
  ]);

  return sol;
}
