import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import pdf from 'pdf-parse';
import prisma from '../prisma';
import { analyzeDocument, findRelevantCaseLaws } from '../services/openai';

const router = Router();

// Configure multer for document uploads
const storage = multer.diskStorage({
  destination: async (req: Request, file: Express.Multer.File, cb: any) => {
    const uploadDir = path.join(process.cwd(), 'uploads', 'documents');
    await fs.mkdir(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req: Request, file: Express.Multer.File, cb: any) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req: Request, file: Express.Multer.File, cb: any) => {
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'text/plain'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF, JPEG, PNG, and TXT files are allowed'));
    }
  }
});

// Extract text from uploaded document
async function extractText(filePath: string, mimeType: string): Promise<string> {
  if (mimeType === 'application/pdf') {
    const dataBuffer = await fs.readFile(filePath);
    const data = await pdf(dataBuffer);
    return data.text;
  } else if (mimeType === 'text/plain') {
    return await fs.readFile(filePath, 'utf-8');
  } else {
    // For images, you'd need OCR (tesseract.js) - placeholder for now
    return '[Image uploaded - OCR not yet implemented. Please use PDF or text files.]';
  }
}

// POST /legal/upload - Upload and analyze document
router.post('/upload', upload.single('document'), async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.sub;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { title, documentType, clientId } = req.body;

    if (!title || !documentType) {
      return res.status(400).json({ error: 'Title and document type are required' });
    }

    // Extract text from document
    const documentText = await extractText(req.file.path, req.file.mimetype);

    // Create document analysis record
    const analysis = await prisma.documentAnalysis.create({
      data: {
        title,
        documentType,
        documentUrl: `/uploads/documents/${req.file.filename}`,
        documentText,
        analysisStatus: 'pending',
        userId,
        clientId: clientId || null
      }
    });

    // Start AI analysis in background (non-blocking)
    performAnalysis(analysis.id, documentText, documentType).catch(err => {
      console.error('Background analysis failed:', err);
    });

    res.json({
      id: analysis.id,
      title: analysis.title,
      documentType: analysis.documentType,
      status: 'pending',
      message: 'Document uploaded successfully. Analysis in progress...'
    });
  } catch (error: any) {
    console.error('Upload error:', error);
    res.status(500).json({ error: error.message || 'Failed to upload document' });
  }
});

// Background analysis function
async function performAnalysis(analysisId: string, documentText: string, documentType: string) {
  try {
    // Update status to analyzing
    await prisma.documentAnalysis.update({
      where: { id: analysisId },
      data: { analysisStatus: 'analyzing' }
    });

    // Perform AI analysis
    const aiResult = await analyzeDocument(documentText, documentType);

    // Fetch all case laws
    const allCaseLaws = await prisma.caseLaw.findMany();

    // Find relevant case laws based on AI keywords
    const relevantCases = await findRelevantCaseLaws(aiResult.suggestedKeywords, allCaseLaws);

    // Update analysis with results
    await prisma.documentAnalysis.update({
      where: { id: analysisId },
      data: {
        analysisStatus: 'completed',
        inconsistencies: aiResult.inconsistencies as any,
        constitutionalIssues: aiResult.constitutionalIssues as any,
        suggestedCaseLaws: relevantCases.map(c => ({
          id: c.id,
          caseName: c.caseName,
          citation: c.citation,
          relevanceScore: c.relevanceScore
        })) as any,
        legalArguments: aiResult.legalArguments as any,
        aiSummary: aiResult.summary
      }
    });

    console.log(`✅ Analysis completed for document ${analysisId}`);
  } catch (error) {
    console.error('Analysis error:', error);
    await prisma.documentAnalysis.update({
      where: { id: analysisId },
      data: { analysisStatus: 'failed' }
    });
  }
}

// GET /legal/analyses - Get all analyses for current user
router.get('/analyses', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.sub;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const analyses = await prisma.documentAnalysis.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        client: {
          select: { id: true, name: true }
        }
      }
    });

    res.json(analyses);
  } catch (error: any) {
    console.error('Fetch analyses error:', error);
    res.status(500).json({ error: 'Failed to fetch analyses' });
  }
});

// GET /legal/analyses/:id - Get specific analysis
router.get('/analyses/:id', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.sub;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id } = req.params;

    const analysis = await prisma.documentAnalysis.findFirst({
      where: { id, userId },
      include: {
        client: {
          select: { id: true, name: true, email: true, phone: true }
        }
      }
    });

    if (!analysis) {
      return res.status(404).json({ error: 'Analysis not found' });
    }

    // If analysis is complete, fetch full case law details
    let caseLawDetails = [];
    if (analysis.analysisStatus === 'completed' && analysis.suggestedCaseLaws) {
      const caseLawIds = (analysis.suggestedCaseLaws as any[]).map((c: any) => c.id);
      caseLawDetails = await prisma.caseLaw.findMany({
        where: { id: { in: caseLawIds } }
      });
    }

    res.json({
      ...analysis,
      caseLawDetails
    });
  } catch (error: any) {
    console.error('Fetch analysis error:', error);
    res.status(500).json({ error: 'Failed to fetch analysis' });
  }
});

// GET /legal/caselaws - Search case laws
router.get('/caselaws', async (req: Request, res: Response) => {
  try {
    const { search, category, jurisdiction } = req.query;

    const where: any = {};

    if (search) {
      where.OR = [
        { caseName: { contains: search as string, mode: 'insensitive' } },
        { summary: { contains: search as string, mode: 'insensitive' } },
        { keywords: { has: search as string } }
      ];
    }

    if (category) {
      where.category = { contains: category as string, mode: 'insensitive' };
    }

    if (jurisdiction) {
      where.jurisdiction = jurisdiction;
    }

    const caseLaws = await prisma.caseLaw.findMany({
      where,
      orderBy: { year: 'desc' },
      take: 50
    });

    res.json(caseLaws);
  } catch (error: any) {
    console.error('Search case laws error:', error);
    res.status(500).json({ error: 'Failed to search case laws' });
  }
});

// DELETE /legal/analyses/:id - Delete analysis
router.delete('/analyses/:id', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.sub;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id } = req.params;

    const analysis = await prisma.documentAnalysis.findFirst({
      where: { id, userId }
    });

    if (!analysis) {
      return res.status(404).json({ error: 'Analysis not found' });
    }

    // Delete file from filesystem
    try {
      const filePath = path.join(process.cwd(), analysis.documentUrl);
      await fs.unlink(filePath);
    } catch (err) {
      console.warn('Failed to delete file:', err);
    }

    // Delete from database
    await prisma.documentAnalysis.delete({
      where: { id }
    });

    res.json({ message: 'Analysis deleted successfully' });
  } catch (error: any) {
    console.error('Delete analysis error:', error);
    res.status(500).json({ error: 'Failed to delete analysis' });
  }
});

export default router;
