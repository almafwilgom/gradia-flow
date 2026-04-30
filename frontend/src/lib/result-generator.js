/**
 * Result Generation and PDF Export System
 * Uses the report-card edge function to assemble report data, generates
 * QR-enabled PDFs client-side, and uploads the finished PDF to Supabase Storage.
 */

import html2pdf from 'html2pdf.js';
import QRCode from 'qrcode';
import { supabase } from './supabaseClient';

const REPORT_CARD_FUNCTION = 'report-card';
const REPORT_CARD_BUCKET = 'report-cards';

function slugify(value, fallback) {
  return (value || fallback || '')
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function escapeHtml(value) {
  return (value ?? '')
    .toString()
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function getAppUrl() {
  if (import.meta.env.VITE_APP_URL) {
    return import.meta.env.VITE_APP_URL.replace(/\/$/, '');
  }

  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin;
  }

  return '';
}

function buildFileName(student = {}, classData = {}, termData = {}) {
  const studentName = slugify(
    student.full_name || [student.first_name, student.last_name].filter(Boolean).join(' ') || student.name,
    'student'
  );
  const className = slugify(classData.name || classData.class_name || classData.label, 'class');
  const termName = slugify(termData.name || termData.term || termData.session_year, 'term');

  return `${studentName}-${className}-${termName}-report-card.pdf`;
}

function formatScore(value, digits = 0) {
  if (value === null || value === undefined || value === '') {
    return '-';
  }

  const numericValue = Number(value);
  if (Number.isNaN(numericValue)) {
    return escapeHtml(value);
  }

  return digits > 0 ? numericValue.toFixed(digits) : `${numericValue}`;
}

function getGradeColor(grade) {
  const colors = {
    A: '#dcfce7',
    B: '#dbeafe',
    C: '#fef3c7',
    D: '#fed7aa',
    E: '#fecaca',
    F: '#fecaca'
  };

  return colors[grade] || '#f3f4f6';
}

function buildVerificationUrl(verificationCode) {
  if (!verificationCode) {
    return null;
  }

  return `${getAppUrl()}/verify/${verificationCode}`;
}

async function generateVerificationQrDataUrl(verificationUrl) {
  if (!verificationUrl) {
    return null;
  }

  return QRCode.toDataURL(verificationUrl, {
    errorCorrectionLevel: 'H',
    type: 'image/png',
    quality: 0.95,
    margin: 1,
    width: 220,
    color: {
      dark: '#000000',
      light: '#FFFFFF'
    }
  });
}

function createPDFContent(reportCard = {}) {
  const {
    student = {},
    school = {},
    results = [],
    attendance = null,
    behaviour = null,
    formRemarks = null,
    principalRemarks = null,
    summary = {},
    class: classData = {},
    term = {},
    verification_code: verificationCode,
    verification_url: verificationUrl,
    generated_at: generatedAt,
    qr_code_data_url: qrCodeDataUrl
  } = reportCard;

  const resolvedVerificationUrl = verificationUrl || buildVerificationUrl(verificationCode);
  const studentName =
    student.full_name ||
    [student.first_name, student.last_name].filter(Boolean).join(' ') ||
    student.name ||
    'Student';
  const sessionYear = term.session_year || summary.session_year || '';
  const termLabel = term.name || term.term || summary.term || '';
  const averageScore = Number(summary.average_score ?? summary.average ?? 0);
  const totalScore = summary.total_score ?? summary.total ?? 0;
  const totalSubjects = summary.total_subjects ?? results.length ?? 0;

  return `
    <div style="font-family: Arial, sans-serif; padding: 24px; color: #111827; background: #ffffff;">
      <div style="border: 1px solid #e5e7eb; border-radius: 16px; overflow: hidden;">
        <div style="background: #111827; color: #ffffff; padding: 24px 28px;">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 20px;">
            <div style="display: flex; align-items: flex-start; gap: 16px;">
              ${
                school.logo_url
                  ? `
                    <div style="width: 80px; height: 80px; background: #ffffff; border-radius: 12px; padding: 4px; display: flex; align-items: center; justify-content: center; overflow: hidden; border: 1px solid #e5e7eb;">
                      <img src="${school.logo_url}" alt="School logo" style="max-width: 100%; max-height: 100%; object-fit: contain;" />
                    </div>
                  `
                  : ''
              }
              <div>
                <div style="font-size: 28px; font-weight: 700;">${escapeHtml(school.name || 'Academic Report Card')}</div>
                <div style="font-size: 14px; margin-top: 6px; opacity: 0.9;">${escapeHtml(school.address || '')}</div>
                <div style="font-size: 14px; margin-top: 4px; opacity: 0.9;">${escapeHtml(termLabel)} ${sessionYear ? `• ${escapeHtml(sessionYear)}` : ''}</div>
              </div>
            </div>
            ${
              qrCodeDataUrl
                ? `
                  <div style="text-align: center;">
                    <img src="${qrCodeDataUrl}" alt="Verification QR code" style="width: 110px; height: 110px; object-fit: contain; background: #ffffff; padding: 8px; border-radius: 12px;" />
                    <div style="font-size: 11px; margin-top: 8px; color: #e5e7eb;">Scan to verify</div>
                  </div>
                `
                : ''
            }
          </div>
        </div>

        <div style="padding: 24px 28px;">
          <div style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; margin-bottom: 20px;">
            <div style="background: #f9fafb; padding: 16px; border-radius: 12px;">
              <div style="font-size: 12px; text-transform: uppercase; color: #6b7280;">Student</div>
              <div style="font-size: 18px; font-weight: 700; margin-top: 6px;">${escapeHtml(studentName)}</div>
              <div style="font-size: 14px; color: #4b5563; margin-top: 4px;">Admission No: ${escapeHtml(student.admission_no || student.admission_number || 'N/A')}</div>
            </div>
            <div style="background: #f9fafb; padding: 16px; border-radius: 12px;">
              <div style="font-size: 12px; text-transform: uppercase; color: #6b7280;">Class</div>
              <div style="font-size: 18px; font-weight: 700; margin-top: 6px;">${escapeHtml(classData.name || classData.class_name || student.class_name || student.class_id || '-')}</div>
              <div style="font-size: 14px; color: #4b5563; margin-top: 4px;">Student ID: ${escapeHtml(student.student_code || student.id || '-')}</div>
            </div>
          </div>

          <div style="margin-bottom: 20px;">
            <h3 style="background: #1e40af; color: #ffffff; padding: 10px 12px; margin: 0 0 10px 0; border-radius: 8px; font-size: 15px;">1. COGNITIVE DOMAIN - ACADEMIC PERFORMANCE</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <thead>
                <tr style="background: #e0e7ff;">
                  <th style="border: 1px solid #d1d5db; padding: 8px; text-align: left;">Subject</th>
                  <th style="border: 1px solid #d1d5db; padding: 8px; text-align: center;">CA</th>
                  <th style="border: 1px solid #d1d5db; padding: 8px; text-align: center;">Exam</th>
                  <th style="border: 1px solid #d1d5db; padding: 8px; text-align: center;">Total</th>
                  <th style="border: 1px solid #d1d5db; padding: 8px; text-align: center;">Grade</th>
                  <th style="border: 1px solid #d1d5db; padding: 8px; text-align: left;">Remark</th>
                </tr>
              </thead>
              <tbody>
                ${
                  results.length
                    ? results
                        .map(
                          (result) => `
                            <tr>
                              <td style="border: 1px solid #d1d5db; padding: 8px;">${escapeHtml(result.subject_name || result.subject?.name || result.subjects?.name || result.subject || '-')}</td>
                              <td style="border: 1px solid #d1d5db; padding: 8px; text-align: center;">${formatScore(result.ca_score)}</td>
                              <td style="border: 1px solid #d1d5db; padding: 8px; text-align: center;">${formatScore(result.exam_score)}</td>
                              <td style="border: 1px solid #d1d5db; padding: 8px; text-align: center; font-weight: 700;">${formatScore(result.total ?? result.score)}</td>
                              <td style="border: 1px solid #d1d5db; padding: 8px; text-align: center; font-weight: 700; background: ${getGradeColor(result.grade)};">${escapeHtml(result.grade || '-')}</td>
                              <td style="border: 1px solid #d1d5db; padding: 8px;">${escapeHtml(result.remark || '-')}</td>
                            </tr>
                          `
                        )
                        .join('')
                    : `
                      <tr>
                        <td colspan="6" style="border: 1px solid #d1d5db; padding: 12px; text-align: center; color: #6b7280;">No subject results available</td>
                      </tr>
                    `
                }
                <tr style="background: #f3f4f6; font-weight: 700;">
                  <td style="border: 1px solid #d1d5db; padding: 8px;">SUMMARY</td>
                  <td style="border: 1px solid #d1d5db; padding: 8px; text-align: center;">-</td>
                  <td style="border: 1px solid #d1d5db; padding: 8px; text-align: center;">-</td>
                  <td style="border: 1px solid #d1d5db; padding: 8px; text-align: center;">${formatScore(totalScore, 2)}</td>
                  <td style="border: 1px solid #d1d5db; padding: 8px; text-align: center;">-</td>
                  <td style="border: 1px solid #d1d5db; padding: 8px;">Average: ${formatScore(averageScore, 2)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          ${
            attendance
              ? `
                <div style="margin-bottom: 20px;">
                  <h3 style="background: #059669; color: #ffffff; padding: 10px 12px; margin: 0 0 10px 0; border-radius: 8px; font-size: 15px;">2. ATTENDANCE SUMMARY</h3>
                  <div style="display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px;">
                    <div style="background: #f0fdf4; border: 1px solid #86efac; padding: 10px; border-radius: 8px; text-align: center;">
                      <div style="font-size: 12px; color: #666;">Present</div>
                      <div style="margin-top: 6px; font-size: 18px; font-weight: 700; color: #059669;">${formatScore(attendance.days_present)}</div>
                    </div>
                    <div style="background: #fef2f2; border: 1px solid #fca5a5; padding: 10px; border-radius: 8px; text-align: center;">
                      <div style="font-size: 12px; color: #666;">Absent</div>
                      <div style="margin-top: 6px; font-size: 18px; font-weight: 700; color: #dc2626;">${formatScore(attendance.days_absent)}</div>
                    </div>
                    <div style="background: #fffbeb; border: 1px solid #fcd34d; padding: 10px; border-radius: 8px; text-align: center;">
                      <div style="font-size: 12px; color: #666;">Late</div>
                      <div style="margin-top: 6px; font-size: 18px; font-weight: 700; color: #f59e0b;">${formatScore(attendance.days_late)}</div>
                    </div>
                    <div style="background: #e0f2fe; border: 1px solid #7dd3fc; padding: 10px; border-radius: 8px; text-align: center;">
                      <div style="font-size: 12px; color: #666;">Attendance %</div>
                      <div style="margin-top: 6px; font-size: 18px; font-weight: 700; color: #0284c7;">${formatScore(attendance.attendance_percentage)}%</div>
                    </div>
                  </div>
                </div>
              `
              : ''
          }

          ${
            behaviour
              ? `
                <div style="margin-bottom: 20px;">
                  <h3 style="background: #d97706; color: #ffffff; padding: 10px 12px; margin: 0 0 10px 0; border-radius: 8px; font-size: 15px;">3. AFFECTIVE DOMAIN - BEHAVIOUR & CONDUCT</h3>
                  <table style="width: 100%; border-collapse: collapse;">
                    <tr style="background: #fef3c7;">
                      <th style="border: 1px solid #d1d5db; padding: 8px; text-align: left;">Aspect</th>
                      <th style="border: 1px solid #d1d5db; padding: 8px; text-align: center;">Rating</th>
                    </tr>
                    ${['obedience', 'honesty', 'respect', 'cooperation', 'punctuality', 'overall_rating']
                      .map(
                        (key) => `
                          <tr>
                            <td style="border: 1px solid #d1d5db; padding: 8px;">${escapeHtml(key.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase()))}</td>
                            <td style="border: 1px solid #d1d5db; padding: 8px; text-align: center;">${escapeHtml(behaviour[key] ?? '-')}</td>
                          </tr>
                        `
                      )
                      .join('')}
                  </table>
                </div>
              `
              : ''
          }

          <div style="margin-bottom: 20px;">
            <h3 style="background: #7c3aed; color: #ffffff; padding: 10px 12px; margin: 0 0 10px 0; border-radius: 8px; font-size: 15px;">4. REMARKS & COMMENTS</h3>
            ${
              formRemarks
                ? `
                  <div style="background: #f3e8ff; padding: 12px; margin-bottom: 10px; border-radius: 8px; border-left: 4px solid #7c3aed;">
                    <div style="font-size: 12px; color: #666; font-weight: 700;">FORM MASTER REMARKS</div>
                    <div style="margin-top: 6px; line-height: 1.5;">${escapeHtml(formRemarks.remarks || formRemarks.comment || '')}</div>
                  </div>
                `
                : ''
            }
            ${
              principalRemarks
                ? `
                  <div style="background: #fce7f3; padding: 12px; border-radius: 8px; border-left: 4px solid #ec4899;">
                    <div style="font-size: 12px; color: #666; font-weight: 700;">PRINCIPAL'S REMARKS</div>
                    <div style="margin-top: 6px; line-height: 1.5;">${escapeHtml(principalRemarks.remarks || principalRemarks.comment || '')}</div>
                  </div>
                `
                : ''
            }
          </div>

          <div style="display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; margin-bottom: 16px;">
            <div style="background: #f9fafb; border-radius: 12px; padding: 14px;">
              <div style="font-size: 12px; color: #6b7280;">Subjects</div>
              <div style="font-size: 20px; font-weight: 700; margin-top: 4px;">${formatScore(totalSubjects)}</div>
            </div>
            <div style="background: #f9fafb; border-radius: 12px; padding: 14px;">
              <div style="font-size: 12px; color: #6b7280;">Total Score</div>
              <div style="font-size: 20px; font-weight: 700; margin-top: 4px;">${formatScore(totalScore, 2)}</div>
            </div>
            <div style="background: #f9fafb; border-radius: 12px; padding: 14px;">
              <div style="font-size: 12px; color: #6b7280;">Average Score</div>
              <div style="font-size: 20px; font-weight: 700; margin-top: 4px;">${formatScore(averageScore, 2)}</div>
            </div>
          </div>

          ${
            resolvedVerificationUrl
              ? `
                <div style="padding-top: 12px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #4b5563;">
                  Verification URL: <span style="color: #2563eb;">${escapeHtml(resolvedVerificationUrl)}</span>
                </div>
              `
              : ''
          }

          <div style="padding-top: 10px; font-size: 12px; color: #6b7280; text-align: center;">
            Generated on ${escapeHtml(generatedAt || new Date().toISOString())}
          </div>
        </div>
      </div>
    </div>
  `;
}

async function renderReportCardPdf(reportCardData = {}) {
  const verificationUrl = reportCardData.verification_url || buildVerificationUrl(reportCardData.verification_code);
  const qrCodeDataUrl =
    reportCardData.qr_code_data_url || (await generateVerificationQrDataUrl(verificationUrl));
  const fileName = buildFileName(
    reportCardData.student,
    reportCardData.class,
    reportCardData.term
  );

  const element = document.createElement('div');
  element.style.position = 'fixed';
  element.style.left = '-99999px';
  element.style.top = '0';
  element.style.width = '820px';
  element.innerHTML = createPDFContent({
    ...reportCardData,
    verification_url: verificationUrl,
    qr_code_data_url: qrCodeDataUrl
  });

  document.body.appendChild(element);

  try {
    const blob = await html2pdf()
      .set({
        margin: 0.3,
        filename: fileName,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' }
      })
      .from(element)
      .outputPdf('blob');

    return {
      blob,
      fileName,
      qrCodeDataUrl,
      verificationUrl
    };
  } finally {
    document.body.removeChild(element);
  }
}

async function uploadReportCard(fileName, pdfBlob, metadata = {}) {
  const { data, error } = await supabase.storage
    .from(REPORT_CARD_BUCKET)
    .upload(fileName, pdfBlob, {
      cacheControl: '3600',
      upsert: true,
      contentType: 'application/pdf',
      metadata
    });

  if (error) {
    throw error;
  }

  const { data: publicUrlData } = supabase.storage
    .from(REPORT_CARD_BUCKET)
    .getPublicUrl(data.path);

  return {
    path: data.path,
    publicUrl: publicUrlData.publicUrl
  };
}

export async function generateStudentResultReport(payload = {}) {
  const { data, error } = await supabase.functions.invoke(REPORT_CARD_FUNCTION, {
    body: payload
  });

  if (error) {
    throw error;
  }

  const reportCardData = data?.report_card || data?.data || data;

  if (!reportCardData?.student) {
    throw new Error('Incomplete report card response from edge function.');
  }

  const { blob, fileName, qrCodeDataUrl, verificationUrl } = await renderReportCardPdf(reportCardData);
  const upload = await uploadReportCard(fileName, blob, {
    studentId: String(reportCardData.student?.id || payload.student_id || ''),
    term: String(reportCardData.term?.term || payload.term || ''),
    sessionYear: String(reportCardData.term?.session_year || payload.session_year || '')
  });

  return {
    ...data,
    report_card: {
      ...reportCardData,
      qr_code_data_url: qrCodeDataUrl || reportCardData.qr_code_data_url || null,
      verification_url: verificationUrl || reportCardData.verification_url || null,
      pdf_file_name: fileName,
      pdf_path: upload.path,
      pdf_url: upload.publicUrl
    }
  };
}

export async function generateQRCode(resultReportId, verificationCode) {
  const verificationUrl = buildVerificationUrl(verificationCode);
  const qrCodeDataUrl = await generateVerificationQrDataUrl(verificationUrl);

  if (!qrCodeDataUrl) {
    throw new Error('Unable to generate QR code without a verification code.');
  }

  const fileName = `qr-${resultReportId}.png`;
  const { error: uploadError } = await supabase.storage
    .from('qr-codes')
    .upload(fileName, dataURLtoFile(qrCodeDataUrl, fileName), {
      upsert: true,
      contentType: 'image/png'
    });

  if (uploadError) {
    throw uploadError;
  }

  const publicUrl = supabase.storage.from('qr-codes').getPublicUrl(fileName).data.publicUrl;

  await supabase
    .from('result_reports')
    .update({ qr_code_url: publicUrl })
    .eq('id', resultReportId);

  return publicUrl;
}

export async function generateResultPDF(studentId, term, sessionYear, schoolId) {
  return generateStudentResultReport({
    student_id: studentId,
    term,
    session_year: sessionYear,
    school_id: schoolId
  });
}

function dataURLtoFile(dataUrl, filename) {
  const arr = dataUrl.split(',');
  const mimeMatch = arr[0].match(/:(.*?);/);
  const mime = mimeMatch ? mimeMatch[1] : 'image/png';
  const binary = atob(arr[1]);
  let index = binary.length;
  const uint8Array = new Uint8Array(index);

  while (index--) {
    uint8Array[index] = binary.charCodeAt(index);
  }

  return new File([uint8Array], filename, { type: mime });
}

export { REPORT_CARD_BUCKET, REPORT_CARD_FUNCTION };

export default {
  generateStudentResultReport,
  generateQRCode,
  generateResultPDF
};