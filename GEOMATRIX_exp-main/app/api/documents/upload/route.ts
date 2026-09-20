import {NextResponse} from 'next/server';

const maxFileSize=10*1024*1024;
const allowedTypes=new Set(['application/pdf','image/jpeg','image/png']);

export async function POST(req:Request){
  const fd=await req.formData();
  const file=fd.get('file');
  if(!(file instanceof File))return NextResponse.json({error:'A document file is required'},{status:400});
  if(file.size>maxFileSize)return NextResponse.json({error:'Document must be 10 MB or smaller'},{status:413});
  if(!allowedTypes.has(file.type))return NextResponse.json({error:'Only PDF, JPEG, and PNG documents are supported'},{status:415});
  return NextResponse.json({mode:'mock',message:'Document accepted for simulated OCR/NLP extraction',fileName:file.name,extracted:{documentType:'Compensation Document',projectId:'NH-112-MAL-01',riskIndicators:['pending verification','signature review']}});
}
