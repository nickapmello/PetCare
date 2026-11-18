import * as animalService from '../services/animalService.js';
import { parseId } from '../utils/parseId.js';

export async function listar(req, res, next) {
  try {
    const animais = await animalService.listar({
      busca: req.query.busca,
      clienteId: req.query.clienteId,
    });
    return res.status(200).json(animais);
  } catch (err) {
    return next(err);
  }
}

export async function buscarPorId(req, res, next) {
  try {
    const id = parseId(req.params.id, 'ID do animal');
    const animal = await animalService.buscarPorId(id);
    return res.status(200).json(animal);
  } catch (err) {
    return next(err);
  }
}

export async function verificarDuplicidade(req, res, next) {
  try {
    const resultado = await animalService.verificarDuplicidade(req.body);
    return res.status(200).json(resultado);
  } catch (err) {
    return next(err);
  }
}

export async function criar(req, res, next) {
  try {
    const animal = await animalService.criar(req.body);
    return res.status(201).json(animal);
  } catch (err) {
    return next(err);
  }
}

export async function atualizar(req, res, next) {
  try {
    const id = parseId(req.params.id, 'ID do animal');
    const animal = await animalService.atualizar(id, req.body);
    return res.status(200).json(animal);
  } catch (err) {
    return next(err);
  }
}

export async function excluir(req, res, next) {
  try {
    const id = parseId(req.params.id, 'ID do animal');
    await animalService.excluir(id);
    return res.status(204).send();
  } catch (err) {
    return next(err);
  }
}

export async function consultarHistorico(req, res, next) {
  try {
    const id = parseId(req.params.id, 'ID do animal');
    const historico = await animalService.consultarHistorico(id);
    return res.status(200).json(historico);
  } catch (err) {
    return next(err);
  }
}

