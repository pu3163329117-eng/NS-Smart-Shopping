const express = require('express');
const { randomUUID } = require('crypto');
const prisma = require('../utils/prisma');
const authenticateToken = require('../middleware/auth');
const { mapServiceFromDb, ensureArray } = require('../utils/dataMappers');

const router = express.Router();

const CROWDFUNDING_STAGES = new Set([
  'draft',
  'under_review',
  'funding',
  'successful',
  'failed',
  'delivering',
  'completed'
]);

const MILESTONE_STATUSES = new Set(['pending', 'in_progress', 'completed', 'blocked']);
const STAGE_TRANSITIONS = Object.freeze({
  draft: ['under_review'],
  under_review: ['funding', 'failed'],
  funding: ['successful', 'failed'],
  successful: ['delivering', 'completed'],
  failed: ['under_review'],
  delivering: ['completed'],
  completed: []
});

const parseCsvEnv = (...keys) => {
  for (const key of keys) {
    const raw = process.env[key];
    if (!raw) continue;
    return raw
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
};

const ADMIN_ID_ALLOWLIST = new Set(parseCsvEnv('GUSHI_ADMIN_IDS', 'ADMIN_USER_IDS'));
const ADMIN_EMAIL_ALLOWLIST = new Set(
  parseCsvEnv('GUSHI_ADMIN_EMAILS', 'ADMIN_EMAILS').map((email) => email.toLowerCase())
);
const ALLOW_DEV_ADMIN_BYPASS = process.env.ALLOW_DEV_ADMIN_BYPASS === 'true';

const isPlainObject = (value) => value && typeof value === 'object' && !Array.isArray(value);
const toMoney = (value) => Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;
const toIso = (value) => (value instanceof Date ? value.toISOString() : value ? new Date(value).toISOString() : null);
const isZhLocale = (req) =>
  String(req?.headers?.['x-locale'] || req?.headers?.['accept-language'] || '')
    .toLowerCase()
    .startsWith('zh');
const withLocale = (req, zh, en) => (isZhLocale(req) ? zh : en);

const toSafePositiveNumber = (value, fallback = 0) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric < 0) {
    return fallback;
  }
  return numeric;
};

const normalizeStage = (value, fallback = 'funding') => {
  const stage = String(value || '').trim();
  if (CROWDFUNDING_STAGES.has(stage)) {
    return stage;
  }
  return fallback;
};

const getAllowedNextStages = (currentStage) => {
  const normalized = normalizeStage(currentStage, '');
  if (!normalized) return [];
  return STAGE_TRANSITIONS[normalized] || [];
};

const canTransitionStage = (fromStage, toStage) => {
  const normalizedFrom = normalizeStage(fromStage, '');
  const normalizedTo = normalizeStage(toStage, '');
  if (!normalizedFrom || !normalizedTo) return false;
  if (normalizedFrom === normalizedTo) return true;
  return getAllowedNextStages(normalizedFrom).includes(normalizedTo);
};

const normalizeMilestones = (value) => {
  return ensureArray(value).map((item, index) => {
    const status = MILESTONE_STATUSES.has(item?.status) ? item.status : 'pending';
    return {
      id: String(item?.id || `ms-${index}-${Date.now()}`),
      title: String(item?.title || `Milestone ${index + 1}`),
      description: String(item?.description || ''),
      targetAmount: toSafePositiveNumber(item?.targetAmount, 0),
      dueDate: toIso(item?.dueDate),
      status,
      note: String(item?.note || ''),
      createdAt: toIso(item?.createdAt) || new Date().toISOString(),
      completedAt: status === 'completed' ? (toIso(item?.completedAt) || new Date().toISOString()) : null
    };
  });
};

const normalizeUpdates = (value) => {
  return ensureArray(value).map((item, index) => ({
    id: String(item?.id || `upd-${index}-${Date.now()}`),
    title: String(item?.title || 'Project Update'),
    content: String(item?.content || ''),
    createdAt: toIso(item?.createdAt) || new Date().toISOString()
  }));
};

const normalizeClosureReport = (value) => {
  if (!isPlainObject(value)) return null;
  const metrics = isPlainObject(value.metrics) ? value.metrics : {};
  return {
    id: String(value.id || `closure-${Date.now()}`),
    title: String(value.title || 'Closure Report'),
    summary: String(value.summary || ''),
    publishedAt: toIso(value.publishedAt) || new Date().toISOString(),
    metrics: {
      raisedAmount: toSafePositiveNumber(metrics.raisedAmount, 0),
      goalAmount: toSafePositiveNumber(metrics.goalAmount, 0),
      backersCount: toSafePositiveNumber(metrics.backersCount, 0),
      milestoneTotal: toSafePositiveNumber(metrics.milestoneTotal, 0),
      milestoneCompleted: toSafePositiveNumber(metrics.milestoneCompleted, 0),
      updateCount: toSafePositiveNumber(metrics.updateCount, 0)
    },
    fundUsage: ensureArray(value.fundUsage).map((row, index) => ({
      id: String(row?.id || `fund-${index}`),
      title: String(row?.title || ''),
      amount: toSafePositiveNumber(row?.amount, 0),
      status: String(row?.status || '')
    })),
    evidence: ensureArray(value.evidence).map((row, index) => ({
      id: String(row?.id || `ev-${index}`),
      title: String(row?.title || ''),
      date: toIso(row?.date),
      content: String(row?.content || '')
    }))
  };
};

const deriveStage = (project, rawMeta = {}) => {
  const explicit = normalizeStage(rawMeta?.stage, '');
  if (explicit) {
    return explicit;
  }

  if (project.status === 'pending') return 'under_review';
  if (project.status === 'rejected') return 'failed';

  const goal = toSafePositiveNumber(project.fundingGoal, 0);
  const pledged = toSafePositiveNumber(project.pledgedAmount, 0);
  const endAt = project.endDate ? new Date(project.endDate).getTime() : null;
  const now = Date.now();

  if (goal > 0 && pledged >= goal) {
    return 'successful';
  }
  if (endAt && endAt < now && pledged < goal) {
    return 'failed';
  }
  return 'funding';
};

const extractCrowdfundingMeta = (project) => {
  const baseFactoryData = isPlainObject(project?.factoryData) ? project.factoryData : {};
  const rawMeta = isPlainObject(baseFactoryData.crowdfunding) ? baseFactoryData.crowdfunding : {};
  const stage = deriveStage(project, rawMeta);

  return {
    stage,
    milestones: normalizeMilestones(rawMeta.milestones),
    updates: normalizeUpdates(rawMeta.updates),
    closureReport: normalizeClosureReport(rawMeta.closureReport),
    createdAt: toIso(rawMeta.createdAt) || toIso(project?.createdAt),
    updatedAt: toIso(rawMeta.updatedAt) || toIso(project?.updatedAt)
  };
};

const mergeCrowdfundingMeta = (project, partialMeta = {}) => {
  const current = extractCrowdfundingMeta(project);
  const currentFactoryData = isPlainObject(project?.factoryData) ? { ...project.factoryData } : {};
  const merged = {
    ...current,
    ...partialMeta,
    stage: normalizeStage(partialMeta.stage, current.stage),
    milestones:
      partialMeta.milestones !== undefined
        ? normalizeMilestones(partialMeta.milestones)
        : current.milestones,
    updates:
      partialMeta.updates !== undefined
        ? normalizeUpdates(partialMeta.updates)
        : current.updates,
    closureReport:
      partialMeta.closureReport !== undefined
        ? normalizeClosureReport(partialMeta.closureReport)
        : current.closureReport,
    updatedAt: new Date().toISOString()
  };

  currentFactoryData.crowdfunding = merged;
  return currentFactoryData;
};

const calcDaysLeft = (endDate) => {
  if (!endDate) return null;
  const end = new Date(endDate).getTime();
  if (!Number.isFinite(end)) return null;
  const delta = end - Date.now();
  return Math.max(0, Math.ceil(delta / (24 * 60 * 60 * 1000)));
};

const projectToViewModel = (project) => {
  const mapped = mapServiceFromDb(project);
  const meta = extractCrowdfundingMeta(project);
  const goal = toSafePositiveNumber(project.fundingGoal, 0);
  const pledged = toSafePositiveNumber(project.pledgedAmount, 0);
  const progress = goal > 0 ? Math.min((pledged / goal) * 100, 100) : 0;

  return {
    ...mapped,
    stage: meta.stage,
    milestones: meta.milestones,
    updates: meta.updates,
    closureReport: meta.closureReport,
    daysLeft: calcDaysLeft(project.endDate),
    progress: Number(progress.toFixed(2))
  };
};

const isAdminUser = (user) => {
  if (ALLOW_DEV_ADMIN_BYPASS) return true;
  const userId = String(user?.id || '').trim();
  const userEmail = String(user?.email || '').trim().toLowerCase();
  return ADMIN_ID_ALLOWLIST.has(userId) || ADMIN_EMAIL_ALLOWLIST.has(userEmail);
};

const canManageProject = (reqUser, project) => {
  if (!reqUser || !project) return false;
  return reqUser.id === project.userId || isAdminUser(reqUser);
};

const requireAdmin = (req, res, next) =>
  authenticateToken(req, res, () => {
    if (!isAdminUser(req.user)) {
      return res.status(403).json({ message: 'Admin access required' });
    }
    next();
  });

const toSupporterViewModel = (order) => ({
  id: order.id,
  amount: toMoney(order.amount),
  createdAt: toIso(order.createdAt),
  userId: order.buyer?.id || null,
  username: order.buyer?.username || 'Anonymous Supporter'
});

const fetchSupporters = async (projectId, limit = 20) => {
  const orders = await prisma.order.findMany({
    where: {
      serviceId: projectId,
      bizType: 'crowdfunding',
      status: { in: ['paid', 'shipped', 'completed'] }
    },
    take: Math.max(1, Math.min(Number(limit) || 20, 100)),
    orderBy: { createdAt: 'desc' },
    include: {
      buyer: {
        select: {
          id: true,
          username: true
        }
      }
    }
  });

  return orders.map(toSupporterViewModel);
};

const createCrowdfundingOrderId = () => `CF-${Date.now()}-${randomUUID().slice(0, 8)}`;
const createCrowdfundingServiceId = () => `cf-${Date.now()}-${randomUUID().slice(0, 6)}`;

const buildDefaultMilestones = (goalAmount, endDate, zh = true) => {
  const target = toSafePositiveNumber(goalAmount, 10000);
  return [
    {
      id: 'ms-review-' + Date.now(),
      title: zh ? '平台审核' : 'Platform review',
      description: zh ? '完成合规检查与项目信息校验。' : 'Initial compliance and project review.',
      targetAmount: 0,
      status: 'in_progress',
      dueDate: null,
      createdAt: new Date().toISOString(),
      completedAt: null
    },
    {
      id: 'ms-funding-' + (Date.now() + 1),
      title: zh ? '达成筹资目标' : 'Funding target',
      description: zh ? '达到目标金额后进入下一执行阶段。' : 'Reach crowdfunding target and unlock production stage.',
      targetAmount: target,
      status: 'pending',
      dueDate: toIso(endDate),
      createdAt: new Date().toISOString(),
      completedAt: null
    }
  ];
};

const buildClosureReport = (req, project, meta) => {
  const now = new Date().toISOString();
  const metrics = {
    raisedAmount: toSafePositiveNumber(project?.pledgedAmount, 0),
    goalAmount: toSafePositiveNumber(project?.fundingGoal, 0),
    backersCount: toSafePositiveNumber(project?.backersCount, 0),
    milestoneTotal: ensureArray(meta?.milestones).length,
    milestoneCompleted: ensureArray(meta?.milestones).filter((item) => item.status === 'completed').length,
    updateCount: ensureArray(meta?.updates).length
  };

  const fundUsage = ensureArray(meta?.milestones)
    .filter((item) => toSafePositiveNumber(item?.targetAmount, 0) > 0)
    .map((item, index) => ({
      id: String(item?.id || `fund-${index}`),
      title: String(item?.title || ''),
      amount: toSafePositiveNumber(item?.targetAmount, 0),
      status: String(item?.status || 'pending')
    }));

  const evidence = ensureArray(meta?.updates)
    .slice(0, 6)
    .map((item, index) => ({
      id: String(item?.id || `ev-${index}`),
      title: String(item?.title || ''),
      date: toIso(item?.createdAt) || now,
      content: String(item?.content || '')
    }));

  const summaryZh = `项目已完成闭环，累计支持者 ${metrics.backersCount} 人，筹集 CNY ${metrics.raisedAmount.toLocaleString()}，里程碑完成 ${metrics.milestoneCompleted}/${metrics.milestoneTotal}，已披露 ${metrics.updateCount} 条执行进展。`;
  const summaryEn = `Closed loop completed with ${metrics.backersCount} supporters, CNY ${metrics.raisedAmount.toLocaleString()} raised, ${metrics.milestoneCompleted}/${metrics.milestoneTotal} milestones completed, and ${metrics.updateCount} published updates.`;

  return {
    id: `closure-${Date.now()}-${randomUUID().slice(0, 6)}`,
    title: withLocale(req, '结项报告', 'Closure Report'),
    summary: withLocale(req, summaryZh, summaryEn),
    publishedAt: now,
    metrics,
    fundUsage,
    evidence
  };
};


router.get('/', async (req, res, next) => {
  try {
    const projects = await prisma.service.findMany({
      where: {
        type: 'crowdfunding',
        status: 'active'
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            avatar: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    res.json(projects.map(projectToViewModel));
  } catch (error) {
    next(error);
  }
});

router.get('/:id/overview', async (req, res, next) => {
  try {
    const project = await prisma.service.findUnique({
      where: { id: req.params.id },
      include: {
        user: {
          select: { id: true, username: true, avatar: true }
        }
      }
    });

    if (!project || project.type !== 'crowdfunding') {
      return res.status(404).json({ message: 'Crowdfunding project not found' });
    }

    if (project.status !== 'active') {
      return res.status(404).json({ message: 'Crowdfunding project is not publicly available' });
    }

    const meta = extractCrowdfundingMeta(project);
    const supporters = await fetchSupporters(project.id, req.query.limit || 20);
    const completedMilestones = meta.milestones.filter((item) => item.status === 'completed').length;

    res.json({
      success: true,
      data: {
        project: projectToViewModel(project),
        milestones: meta.milestones,
        updates: meta.updates,
        closureReport: meta.closureReport,
        supporters,
        stats: {
          goalAmount: toSafePositiveNumber(project.fundingGoal, 0),
          pledgedAmount: toSafePositiveNumber(project.pledgedAmount, 0),
          backersCount: Number(project.backersCount || 0),
          milestoneTotal: meta.milestones.length,
          milestoneCompleted: completedMilestones,
          daysLeft: calcDaysLeft(project.endDate)
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

router.get('/:id/supporters', async (req, res, next) => {
  try {
    const project = await prisma.service.findUnique({
      where: { id: req.params.id },
      select: { id: true, type: true, status: true }
    });

    if (!project || project.type !== 'crowdfunding') {
      return res.status(404).json({ message: 'Crowdfunding project not found' });
    }

    if (project.status !== 'active') {
      return res.status(404).json({ message: 'Crowdfunding project is not publicly available' });
    }

    const supporters = await fetchSupporters(project.id, req.query.limit || 30);
    res.json({ success: true, data: supporters });
  } catch (error) {
    next(error);
  }
});

router.get('/:id/milestones', async (req, res, next) => {
  try {
    const project = await prisma.service.findUnique({
      where: { id: req.params.id }
    });

    if (!project || project.type !== 'crowdfunding') {
      return res.status(404).json({ message: 'Crowdfunding project not found' });
    }
    if (project.status !== 'active') {
      return res.status(404).json({ message: 'Crowdfunding project is not publicly available' });
    }

    const { milestones } = extractCrowdfundingMeta(project);
    res.json({ success: true, data: milestones });
  } catch (error) {
    next(error);
  }
});

router.get('/:id/updates', async (req, res, next) => {
  try {
    const project = await prisma.service.findUnique({
      where: { id: req.params.id }
    });

    if (!project || project.type !== 'crowdfunding') {
      return res.status(404).json({ message: 'Crowdfunding project not found' });
    }
    if (project.status !== 'active') {
      return res.status(404).json({ message: 'Crowdfunding project is not publicly available' });
    }

    const { updates } = extractCrowdfundingMeta(project);
    res.json({ success: true, data: updates });
  } catch (error) {
    next(error);
  }
});

router.post('/:id/support', authenticateToken, async (req, res, next) => {
  try {
    const supportAmount = toMoney(req.body?.amount);
    if (!supportAmount || supportAmount <= 0) {
      return res.status(400).json({ message: 'Invalid support amount' });
    }

    const projectId = req.params.id;
    const userId = req.user.id;

    const result = await prisma.$transaction(async (tx) => {
      const project = await tx.service.findUnique({
        where: { id: projectId }
      });

      if (!project || project.type !== 'crowdfunding') {
        const err = new Error('Crowdfunding project not found');
        err.statusCode = 404;
        throw err;
      }

      if (project.status !== 'active') {
        const err = new Error('Crowdfunding project is not open for support');
        err.statusCode = 400;
        throw err;
      }

      const meta = extractCrowdfundingMeta(project);
      if (meta.stage === 'under_review' || meta.stage === 'failed' || meta.stage === 'completed') {
        const err = new Error('Current project stage does not accept support');
        err.statusCode = 400;
        throw err;
      }

      const supporter = await tx.user.findUnique({
        where: { id: userId }
      });
      if (!supporter) {
        const err = new Error('User not found');
        err.statusCode = 404;
        throw err;
      }
      if (Number(supporter.walletBalance || 0) < supportAmount) {
        const err = new Error('Insufficient wallet balance');
        err.statusCode = 402;
        throw err;
      }

      const updatedUser = await tx.user.update({
        where: { id: userId },
        data: {
          walletBalance: { decrement: supportAmount }
        }
      });

      await tx.userTransaction.create({
        data: {
          userId,
          type: 'payment',
          title: `Support Project: ${project.title}`,
          amount: -supportAmount,
          balanceAfter: Number(updatedUser.walletBalance || 0),
          channel: 'wallet',
          status: 'completed'
        }
      });

      const order = await tx.order.create({
        data: {
          id: createCrowdfundingOrderId(),
          buyerId: userId,
          serviceId: project.id,
          providerId: project.userId,
          amount: supportAmount,
          status: 'paid',
          bizType: 'crowdfunding'
        }
      });

      const nextPledged = toMoney(Number(project.pledgedAmount || 0) + supportAmount);
      const goal = toSafePositiveNumber(project.fundingGoal, 0);
      const nextStage =
        goal > 0 && nextPledged >= goal && (meta.stage === 'funding' || meta.stage === 'under_review')
          ? 'successful'
          : meta.stage;
      const nextFactoryData = mergeCrowdfundingMeta(project, { stage: nextStage });

      const updatedProject = await tx.service.update({
        where: { id: project.id },
        data: {
          pledgedAmount: { increment: supportAmount },
          backersCount: { increment: 1 },
          factoryData: nextFactoryData
        }
      });

      await tx.notification.create({
        data: {
          userId: project.userId,
          title: withLocale(req, '收到新的支持', 'New Project Support'),
          content: withLocale(
            req,
            `有支持者为你的项目“${project.title}”贡献了 CNY ${supportAmount}。`,
            `A supporter contributed CNY ${supportAmount} to your project "${project.title}".`
          ),
          type: 'system',
          link: '/maker/orders'
        }
      });

      return { order, updatedProject };
    });

    res.json({
      success: true,
      message: withLocale(req, '支持成功', 'Support successful'),
      data: {
        order: result.order,
        project: projectToViewModel(result.updatedProject)
      }
    });
  } catch (error) {
    if (error.message === 'Insufficient wallet balance') {
      return res.status(402).json({ message: error.message });
    }
    if (error.statusCode) {
      return res.status(error.statusCode).json({ message: error.message });
    }
    next(error);
  }
});

router.post('/apply', authenticateToken, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const roadshow = Boolean(req.body?.roadshow);
    const title = String(req.body?.title || '').trim();

    if (roadshow) {
      const projectId = String(req.body?.projectId || '').trim();
      if (projectId) {
        const project = await prisma.service.findUnique({ where: { id: projectId } });
        if (project && project.type === 'crowdfunding' && project.userId !== userId) {
          await prisma.notification.create({
            data: {
              userId: project.userId,
              title: withLocale(req, '路演预约通知', 'Roadshow Booking'),
              content: withLocale(
                req,
                `有支持者为你的项目“${project.title}”预约了路演席位。`,
                `A supporter reserved a roadshow slot for "${project.title}".`
              ),
              type: 'system',
              link: `/crowdfunding`
            }
          });
        }
      }

      await prisma.notification.create({
        data: {
          userId,
          title: withLocale(req, '路演预约已提交', 'Roadshow Booking Confirmed'),
          content: withLocale(
            req,
            `你的路演预约已提交${title ? `（${title}）` : ''}。`,
            `Your roadshow booking has been received${title ? ` for "${title}"` : ''}.`
          ),
          type: 'system'
        }
      });

      return res.json({
        success: true,
        message: withLocale(req, '路演预约提交成功。', 'Roadshow booking submitted successfully.'),
        status: 'pending'
      });
    }

    const description = String(req.body?.description || '').trim();
    const goalAmount = toSafePositiveNumber(req.body?.goalAmount, 10000);
    const durationDaysRaw = Number.parseInt(req.body?.durationDays, 10);
    const durationDays = Number.isInteger(durationDaysRaw) ? Math.max(7, Math.min(durationDaysRaw, 180)) : 30;

    let endDate = req.body?.endDate ? new Date(req.body.endDate) : null;
    if (!endDate || Number.isNaN(endDate.getTime())) {
      endDate = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000);
    }

    const serviceTitle = title || withLocale(req, '新的众筹项目申请', 'New Crowdfunding Project Application');
    const tags = Array.from(
      new Set([...ensureArray(req.body?.tags).map((tag) => String(tag).trim()).filter(Boolean), 'crowdfunding'])
    );
    const milestones = buildDefaultMilestones(goalAmount, endDate, isZhLocale(req));
    const updates = [
      {
        id: `upd-apply-${Date.now()}`,
        title: withLocale(req, '申请已提交', 'Application Submitted'),
        content: withLocale(req, '项目申请已提交，等待平台审核。', 'Project application has been submitted and is pending review.'),
        createdAt: new Date().toISOString()
      }
    ];

    const application = await prisma.service.create({
      data: {
        id: createCrowdfundingServiceId(),
        title: serviceTitle,
        description: description || serviceTitle,
        price: 0,
        type: 'crowdfunding',
        status: 'pending',
        image: req.body?.image || null,
        details: req.body?.details || null,
        tags,
        fundingGoal: goalAmount,
        pledgedAmount: 0,
        backersCount: 0,
        endDate,
        userId,
        provider: user.username || 'Maker',
        factoryData: {
          crowdfunding: {
            stage: 'under_review',
            milestones,
            updates,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }
        }
      }
    });

    await prisma.notification.create({
      data: {
        userId,
        title: withLocale(req, '申请已受理', 'Application Received'),
        content: withLocale(
          req,
          `你的众筹申请“${serviceTitle}”已受理，正在审核中。`,
          `Your application for "${serviceTitle}" has been received and is under review.`
        ),
        type: 'system',
        link: '/crowdfunding'
      }
    });

    res.json({
      success: true,
      message: withLocale(req, '申请提交成功，平台将尽快完成审核。', 'Application submitted successfully. Our team will review your request.'),
      status: 'pending',
      data: {
        applicationId: application.id
      }
    });
  } catch (error) {
    next(error);
  }
});

router.get('/my/applications', authenticateToken, async (req, res, next) => {
  try {
    const projects = await prisma.service.findMany({
      where: {
        userId: req.user.id,
        type: 'crowdfunding'
      },
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: { id: true, username: true, avatar: true }
        }
      }
    });

    res.json({ success: true, data: projects.map(projectToViewModel) });
  } catch (error) {
    next(error);
  }
});

router.post('/:id/milestones', authenticateToken, async (req, res, next) => {
  try {
    const project = await prisma.service.findUnique({ where: { id: req.params.id } });
    if (!project || project.type !== 'crowdfunding') {
      return res.status(404).json({ message: 'Crowdfunding project not found' });
    }
    if (!canManageProject(req.user, project)) {
      return res.status(403).json({ message: 'Only project owner can manage milestones' });
    }

    const title = String(req.body?.title || '').trim();
    if (!title) {
      return res.status(400).json({ message: 'Milestone title is required' });
    }

    const milestone = {
      id: `ms-${Date.now()}-${randomUUID().slice(0, 6)}`,
      title,
      description: String(req.body?.description || '').trim(),
      targetAmount: toSafePositiveNumber(req.body?.targetAmount, 0),
      dueDate: toIso(req.body?.dueDate),
      status: MILESTONE_STATUSES.has(req.body?.status) ? req.body.status : 'pending',
      note: String(req.body?.note || '').trim(),
      createdAt: new Date().toISOString(),
      completedAt: null
    };

    const meta = extractCrowdfundingMeta(project);
    const nextMilestones = [...meta.milestones, milestone];

    const updated = await prisma.service.update({
      where: { id: project.id },
      data: {
        factoryData: mergeCrowdfundingMeta(project, { milestones: nextMilestones })
      }
    });

    res.json({
      success: true,
      data: {
        milestone,
        project: projectToViewModel(updated)
      }
    });
  } catch (error) {
    next(error);
  }
});

router.patch('/:id/milestones/:milestoneId', authenticateToken, async (req, res, next) => {
  try {
    const project = await prisma.service.findUnique({ where: { id: req.params.id } });
    if (!project || project.type !== 'crowdfunding') {
      return res.status(404).json({ message: 'Crowdfunding project not found' });
    }
    if (!canManageProject(req.user, project)) {
      return res.status(403).json({ message: 'Only project owner can manage milestones' });
    }

    const meta = extractCrowdfundingMeta(project);
    const targetIndex = meta.milestones.findIndex((item) => item.id === req.params.milestoneId);
    if (targetIndex < 0) {
      return res.status(404).json({ message: 'Milestone not found' });
    }

    const current = meta.milestones[targetIndex];
    const nextStatus = MILESTONE_STATUSES.has(req.body?.status) ? req.body.status : current.status;
    const patched = {
      ...current,
      title: req.body?.title !== undefined ? String(req.body.title).trim() || current.title : current.title,
      description:
        req.body?.description !== undefined ? String(req.body.description).trim() : current.description,
      targetAmount:
        req.body?.targetAmount !== undefined
          ? toSafePositiveNumber(req.body.targetAmount, current.targetAmount)
          : current.targetAmount,
      dueDate: req.body?.dueDate !== undefined ? toIso(req.body.dueDate) : current.dueDate,
      note: req.body?.note !== undefined ? String(req.body.note).trim() : current.note,
      status: nextStatus,
      completedAt:
        nextStatus === 'completed' ? current.completedAt || new Date().toISOString() : null
    };

    const nextMilestones = [...meta.milestones];
    nextMilestones[targetIndex] = patched;

    const updated = await prisma.service.update({
      where: { id: project.id },
      data: {
        factoryData: mergeCrowdfundingMeta(project, { milestones: nextMilestones })
      }
    });

    res.json({
      success: true,
      data: {
        milestone: patched,
        project: projectToViewModel(updated)
      }
    });
  } catch (error) {
    next(error);
  }
});

router.post('/:id/updates', authenticateToken, async (req, res, next) => {
  try {
    const project = await prisma.service.findUnique({ where: { id: req.params.id } });
    if (!project || project.type !== 'crowdfunding') {
      return res.status(404).json({ message: 'Crowdfunding project not found' });
    }
    if (!canManageProject(req.user, project)) {
      return res.status(403).json({ message: 'Only project owner can post updates' });
    }

    const title = String(req.body?.title || '').trim();
    const content = String(req.body?.content || '').trim();
    if (!title || !content) {
      return res.status(400).json({ message: 'Update title and content are required' });
    }

    const updateItem = {
      id: `upd-${Date.now()}-${randomUUID().slice(0, 6)}`,
      title,
      content,
      createdAt: new Date().toISOString()
    };

    const meta = extractCrowdfundingMeta(project);
    const nextUpdates = [updateItem, ...meta.updates].slice(0, 50);

    const updated = await prisma.service.update({
      where: { id: project.id },
      data: {
        factoryData: mergeCrowdfundingMeta(project, { updates: nextUpdates })
      }
    });

    const supporterUsers = await prisma.order.findMany({
      where: {
        serviceId: project.id,
        bizType: 'crowdfunding',
        status: { in: ['paid', 'shipped', 'completed'] }
      },
      distinct: ['buyerId'],
      select: { buyerId: true }
    });

    const notificationPayload = supporterUsers
      .map((row) => row.buyerId)
      .filter((id) => id && id !== req.user.id)
      .map((id) => ({
        userId: id,
        title: withLocale(req, '项目进展更新', 'Project Update'),
        content: withLocale(req, `“${project.title}”发布新进展：${title}`, `${project.title}: ${title}`),
        type: 'system',
        link: '/crowdfunding'
      }));

    if (notificationPayload.length) {
      await prisma.notification.createMany({
        data: notificationPayload
      });
    }

    res.json({
      success: true,
      data: {
        update: updateItem,
        project: projectToViewModel(updated)
      }
    });
  } catch (error) {
    next(error);
  }
});

router.patch('/:id/stage', authenticateToken, async (req, res, next) => {
  try {
    const project = await prisma.service.findUnique({ where: { id: req.params.id } });
    if (!project || project.type !== 'crowdfunding') {
      return res.status(404).json({ message: 'Crowdfunding project not found' });
    }
    if (!canManageProject(req.user, project)) {
      return res.status(403).json({ message: 'Only project owner can change stage' });
    }

    const stage = normalizeStage(req.body?.stage, '');
    if (!stage) {
      return res.status(400).json({ message: 'Invalid stage value' });
    }

    const currentMeta = extractCrowdfundingMeta(project);
    const currentStage = currentMeta.stage;
    if (!canTransitionStage(currentStage, stage)) {
      return res.status(400).json({
        message: `Invalid stage transition: ${currentStage} -> ${stage}`,
        data: {
          currentStage,
          targetStage: stage,
          allowedNextStages: getAllowedNextStages(currentStage)
        }
      });
    }

    const enteringCompleted = currentStage !== 'completed' && stage === 'completed';
    const nextClosureReport =
      stage === 'completed'
        ? currentMeta.closureReport || buildClosureReport(req, project, currentMeta)
        : currentMeta.closureReport;

    const updated = await prisma.service.update({
      where: { id: project.id },
      data: {
        factoryData: mergeCrowdfundingMeta(project, {
          stage,
          closureReport: nextClosureReport
        })
      }
    });

    if (enteringCompleted) {
      const supporterRows = await prisma.order.findMany({
        where: {
          serviceId: project.id,
          bizType: 'crowdfunding',
          status: { in: ['paid', 'shipped', 'completed'] }
        },
        distinct: ['buyerId'],
        select: { buyerId: true }
      });

      const supporterNotifications = supporterRows
        .map((row) => row.buyerId)
        .filter((userId) => userId && userId !== req.user.id)
        .map((userId) => ({
          userId,
          title: withLocale(req, '结项报告已发布', 'Closure Report Published'),
          content: withLocale(
            req,
            `你支持的项目“${project.title}”已完成结项，现可查看完整执行报告。`,
            `The project "${project.title}" you supported has completed its closed loop. You can now view the closure report.`
          ),
          type: 'system',
          link: '/crowdfunding'
        }));

      if (supporterNotifications.length) {
        await prisma.notification.createMany({
          data: supporterNotifications
        });
      }
    }

    res.json({ success: true, data: projectToViewModel(updated) });
  } catch (error) {
    next(error);
  }
});

router.get('/admin/applications', requireAdmin, async (req, res, next) => {
  try {
    const status = String(req.query?.status || 'pending').trim();
    const where = {
      type: 'crowdfunding',
      status
    };

    const applications = await prisma.service.findMany({
      where,
      include: {
        user: {
          select: { id: true, username: true, avatar: true, email: true }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 100
    });

    res.json({
      success: true,
      data: applications.map(projectToViewModel)
    });
  } catch (error) {
    next(error);
  }
});

router.post('/admin/:id/approve', requireAdmin, async (req, res, next) => {
  try {
    const project = await prisma.service.findUnique({ where: { id: req.params.id } });
    if (!project || project.type !== 'crowdfunding') {
      return res.status(404).json({ message: 'Crowdfunding project not found' });
    }

    const updated = await prisma.service.update({
      where: { id: project.id },
      data: {
        status: 'active',
        factoryData: mergeCrowdfundingMeta(project, { stage: 'funding' })
      }
    });

    await prisma.notification.create({
      data: {
        userId: project.userId,
        title: withLocale(req, '申请已通过', 'Application Approved'),
        content: withLocale(
          req,
          `你的众筹申请“${project.title}”已通过审核并已上线。`,
          `Your crowdfunding application "${project.title}" is approved and now live.`
        ),
        type: 'system',
        link: '/crowdfunding'
      }
    });

    res.json({ success: true, data: projectToViewModel(updated) });
  } catch (error) {
    next(error);
  }
});

router.post('/admin/:id/reject', requireAdmin, async (req, res, next) => {
  try {
    const project = await prisma.service.findUnique({ where: { id: req.params.id } });
    if (!project || project.type !== 'crowdfunding') {
      return res.status(404).json({ message: 'Crowdfunding project not found' });
    }

    const reason = String(req.body?.reason || '').trim();

    const updated = await prisma.service.update({
      where: { id: project.id },
      data: {
        status: 'rejected',
        factoryData: mergeCrowdfundingMeta(project, { stage: 'failed' })
      }
    });

    await prisma.notification.create({
      data: {
        userId: project.userId,
        title: withLocale(req, '申请未通过', 'Application Rejected'),
        content: reason
          ? withLocale(
            req,
            `你的众筹申请“${project.title}”未通过，原因：${reason}`,
            `Your crowdfunding application "${project.title}" was rejected. Reason: ${reason}`
          )
          : withLocale(
            req,
            `你的众筹申请“${project.title}”未通过。`,
            `Your crowdfunding application "${project.title}" was rejected.`
          ),
        type: 'system',
        link: '/crowdfunding'
      }
    });

    res.json({ success: true, data: projectToViewModel(updated) });
  } catch (error) {
    next(error);
  }
});

module.exports = router;

