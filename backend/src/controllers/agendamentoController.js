import * as agendamentoService from '../services/agendamentoService.js';
import { parseId } from '../utils/parseId.js';

export async function listar(req, res, next) {
  try {
    const agendamentos = await agendamentoService.listar({
      data: req.query.data,
      status: req.query.status,
      animalId: req.query.animalId,
    });
    return res.status(200).json(agendamentos);
  } catch (err) {
    return next(err);
  }
}

export async function buscarPorId(req, res, next) {
  try {
    const id = parseId(req.params.id, 'ID do agendamento');
    const agendamento = await agendamentoService.buscarPorId(id);
    return res.status(200).json(agendamento);
  } catch (err) {
    return next(err);
  }
}

export async function criar(req, res, next) {
  try {
    const agendamento = await agendamentoService.criar(req.body, req.usuario.id);
    return res.status(201).json(agendamento);
  } catch (err) {
    return next(err);
  }
}

export async function reagendar(req, res, next) {
  try {
    const id = parseId(req.params.id, 'ID do agendamento');
    const agendamento = await agendamentoService.reagendar(id, req.body);
    return res.status(200).json(agendamento);
  } catch (err) {
    return next(err);
  }
}

export async function cancelar(req, res, next) {
  try {
    const id = parseId(req.params.id, 'ID do agendamento');
    const agendamento = await agendamentoService.cancelar(id);
    return res.status(200).json(agendamento);
  } catch (err) {
    return next(err);
  }
}

export async function concluir(req, res, next) {
  try {
    const id = parseId(req.params.id, 'ID do agendamento');
    const agendamento = await agendamentoService.concluir(id);
    return res.status(200).json(agendamento);
  } catch (err) {
    return next(err);
  }
}

