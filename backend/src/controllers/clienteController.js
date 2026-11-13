import * as clienteService from '../services/clienteService.js';
import { parseId } from '../utils/parseId.js';

export async function listar(req, res, next) {
  try {
    const clientes = await clienteService.listar({ busca: req.query.busca });
    return res.status(200).json(clientes);
  } catch (err) {
    return next(err);
  }
}

export async function buscarPorId(req, res, next) {
  try {
    const id = parseId(req.params.id, 'ID do cliente');
    const cliente = await clienteService.buscarPorId(id);
    return res.status(200).json(cliente);
  } catch (err) {
    return next(err);
  }
}

export async function criar(req, res, next) {
  try {
    const cliente = await clienteService.criar(req.body);
    return res.status(201).json(cliente);
  } catch (err) {
    return next(err);
  }
}

export async function atualizar(req, res, next) {
  try {
    const id = parseId(req.params.id, 'ID do cliente');
    const cliente = await clienteService.atualizar(id, req.body);
    return res.status(200).json(cliente);
  } catch (err) {
    return next(err);
  }
}

export async function excluir(req, res, next) {
  try {
    const id = parseId(req.params.id, 'ID do cliente');
    await clienteService.excluir(id);
    return res.status(204).send();
  } catch (err) {
    return next(err);
  }
}

