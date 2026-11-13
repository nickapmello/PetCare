import * as servicoService from '../services/servicoService.js';
import { parseId } from '../utils/parseId.js';

export async function listar(req, res, next) {
  try {
    const servicos = await servicoService.listar({ busca: req.query.busca });
    return res.status(200).json(servicos);
  } catch (err) {
    return next(err);
  }
}

export async function buscarPorId(req, res, next) {
  try {
    const id = parseId(req.params.id, 'ID do serviço');
    const servico = await servicoService.buscarPorId(id);
    return res.status(200).json(servico);
  } catch (err) {
    return next(err);
  }
}

export async function criar(req, res, next) {
  try {
    const servico = await servicoService.criar(req.body);
    return res.status(201).json(servico);
  } catch (err) {
    return next(err);
  }
}

export async function atualizar(req, res, next) {
  try {
    const id = parseId(req.params.id, 'ID do serviço');
    const servico = await servicoService.atualizar(id, req.body);
    return res.status(200).json(servico);
  } catch (err) {
    return next(err);
  }
}

export async function excluir(req, res, next) {
  try {
    const id = parseId(req.params.id, 'ID do serviço');
    await servicoService.excluir(id);
    return res.status(204).send();
  } catch (err) {
    return next(err);
  }
}

