/**
 * Invoice Repository
 * 
 * Data access layer for invoices and related entities.
 * Handles all database operations for invoices, line items, payments, and reminders.
 * 
 * @module ScholarlyPayment/Repositories
 * @version 1.0.0
 */

import { PoolClient } from 'pg';
import {
  Invoice,
  InvoiceStatus,
  InvoiceLineItem,
  InvoicePayment,
  InvoicePaymentPlan,
  InvoiceReminder,
  InvoiceXeroSync,
  InvoiceStatusChange,
  InvoicePartyDetails,
  FeeCategory,
  Currency,
  PaymentMethod,
  Result,
  success,
  failure,
  NotFoundError,
  ValidationError
} from '../types';

import {
  getPool,
  withTransaction,
  logger,
  generateId,
  generateInvoiceNumber
} from '../infrastructure';

// ============================================================================
// REPOSITORY INTERFACE
// ============================================================================

export interface InvoiceFilters {
  tenantId?: string;
  issuerId?: string;
  recipientId?: string;
  studentId?: string;
  status?: InvoiceStatus[];
  statusNot?: InvoiceStatus[];
  category?: FeeCategory[];
  dueDateFrom?: Date;
  dueDateTo?: Date;
  issueDateFrom?: Date;
  issueDateTo?: Date;
  amountFrom?: number;
  amountTo?: number;
  overdue?: boolean;
  hasPaymentPlan?: boolean;
  search?: string;
  limit?: number;
  offset?: number;
  orderBy?: 'issueDate' | 'dueDate' | 'total' | 'amountDue' | 'createdAt';
  orderDirection?: 'asc' | 'desc';
}

export interface InvoiceRepository {
  // Core CRUD
  findById(id: string): Promise<Invoice | null>;
  findByNumber(invoiceNumber: string): Promise<Invoice | null>;
  findAll(filters: InvoiceFilters): Promise<{ invoices: Invoice[]; total: number }>;
  create(invoice: Omit<Invoice, 'id' | 'createdAt' | 'updatedAt'>): Promise<Invoice>;
  update(id: string, updates: Partial<Invoice>): Promise<Invoice>;
  delete(id: string): Promise<void>;
  
  // Status operations
  updateStatus(id: string, status: InvoiceStatus, reason?: string, userId?: string): Promise<Invoice>;
  
  // Line items
  addLineItem(invoiceId: string, lineItem: Omit<InvoiceLineItem, 'id'>): Promise<InvoiceLineItem>;
  updateLineItem(invoiceId: string, lineItemId: string, updates: Partial<InvoiceLineItem>): Promise<InvoiceLineItem>;
  removeLineItem(invoiceId: string, lineItemId: string): Promise<void>;
  recalculateTotals(invoiceId: string): Promise<Invoice>;
  
  // Payments
  addPayment(invoiceId: string, payment: Omit<InvoicePayment, 'id'>): Promise<InvoicePayment>;
  updatePayment(invoiceId: string, paymentId: string, updates: Partial<InvoicePayment>): Promise<InvoicePayment>;
  
  // Reminders
  addReminder(invoiceId: string, reminder: Omit<InvoiceReminder, 'id'>): Promise<InvoiceReminder>;
  
  // Payment plans
  setPaymentPlan(invoiceId: string, plan: InvoicePaymentPlan): Promise<void>;
  updatePaymentPlan(invoiceId: string, updates: Partial<InvoicePaymentPlan>): Promise<void>;
  
  // Xero sync
  updateXeroSync(invoiceId: string, sync: InvoiceXeroSync): Promise<void>;
  
  // Aggregate queries
  getOverdueInvoices(tenantId: string, limit?: number): Promise<Invoice[]>;
  getUpcomingDueInvoices(tenantId: string, days: number): Promise<Invoice[]>;
  getInvoiceSummary(accountId: string): Promise<InvoiceSummary>;
  getNextInvoiceNumber(accountId: string): Promise<number>;
}

export interface InvoiceSummary {
  totalInvoices: number;
  totalAmount: number;
  paidAmount: number;
  outstandingAmount: number;
  overdueAmount: number;
  overdueCount: number;
  averagePaymentDays: number;
}

// ============================================================================
// REPOSITORY IMPLEMENTATION
// ============================================================================

export class PostgresInvoiceRepository implements InvoiceRepository {
  
  /**
   * Find invoice by ID
   */
  async findById(id: string): Promise<Invoice | null> {
    const pool = getPool();
    const result = await pool.query(
      `SELECT * FROM invoices WHERE id = $1`,
      [id]
    );
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return this.mapRowToInvoice(result.rows[0]);
  }

  /**
   * Find invoice by number
   */
  async findByNumber(invoiceNumber: string): Promise<Invoice | null> {
    const pool = getPool();
    const result = await pool.query(
      `SELECT * FROM invoices WHERE invoice_number = $1`,
      [invoiceNumber]
    );
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return this.mapRowToInvoice(result.rows[0]);
  }

  /**
   * Find all invoices with filters
   */
  async findAll(filters: InvoiceFilters): Promise<{ invoices: Invoice[]; total: number }> {
    const pool = getPool();
    const conditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (filters.tenantId) {
      conditions.push(`tenant_id = $${paramIndex++}`);
      params.push(filters.tenantId);
    }

    if (filters.issuerId) {
      conditions.push(`issuer_id = $${paramIndex++}`);
      params.push(filters.issuerId);
    }

    if (filters.recipientId) {
      conditions.push(`recipient_id = $${paramIndex++}`);
      params.push(filters.recipientId);
    }

    if (filters.studentId) {
      conditions.push(`student_id = $${paramIndex++}`);
      params.push(filters.studentId);
    }

    if (filters.status && filters.status.length > 0) {
      conditions.push(`status = ANY($${paramIndex++})`);
      params.push(filters.status);
    }

    if (filters.statusNot && filters.statusNot.length > 0) {
      conditions.push(`status != ALL($${paramIndex++})`);
      params.push(filters.statusNot);
    }

    if (filters.dueDateFrom) {
      conditions.push(`due_date >= $${paramIndex++}`);
      params.push(filters.dueDateFrom);
    }

    if (filters.dueDateTo) {
      conditions.push(`due_date <= $${paramIndex++}`);
      params.push(filters.dueDateTo);
    }

    if (filters.issueDateFrom) {
      conditions.push(`issue_date >= $${paramIndex++}`);
      params.push(filters.issueDateFrom);
    }

    if (filters.issueDateTo) {
      conditions.push(`issue_date <= $${paramIndex++}`);
      params.push(filters.issueDateTo);
    }

    if (filters.amountFrom !== undefined) {
      conditions.push(`total >= $${paramIndex++}`);
      params.push(filters.amountFrom);
    }

    if (filters.amountTo !== undefined) {
      conditions.push(`total <= $${paramIndex++}`);
      params.push(filters.amountTo);
    }

    if (filters.overdue === true) {
      conditions.push(`status = 'overdue' OR (due_date < NOW() AND status IN ('sent', 'viewed', 'partial'))`);
    }

    if (filters.hasPaymentPlan !== undefined) {
      if (filters.hasPaymentPlan) {
        conditions.push(`payment_plan IS NOT NULL`);
      } else {
        conditions.push(`payment_plan IS NULL`);
      }
    }

    if (filters.search) {
      conditions.push(`(
        invoice_number ILIKE $${paramIndex++} OR
        recipient_details->>'name' ILIKE $${paramIndex++} OR
        student_name ILIKE $${paramIndex++}
      )`);
      const searchTerm = `%${filters.search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Order by
    const orderByMap: Record<string, string> = {
      issueDate: 'issue_date',
      dueDate: 'due_date',
      total: 'total',
      amountDue: 'amount_due',
      createdAt: 'created_at'
    };
    const orderBy = orderByMap[filters.orderBy || 'createdAt'] || 'created_at';
    const orderDirection = filters.orderDirection === 'asc' ? 'ASC' : 'DESC';

    // Get total count
    const countResult = await pool.query(
      `SELECT COUNT(*) as total FROM invoices ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].total);

    // Get invoices with pagination
    const limit = Math.min(filters.limit || 50, 100);
    const offset = filters.offset || 0;

    const result = await pool.query(
      `SELECT * FROM invoices ${whereClause}
       ORDER BY ${orderBy} ${orderDirection}
       LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
      [...params, limit, offset]
    );

    const invoices = result.rows.map(row => this.mapRowToInvoice(row));

    return { invoices, total };
  }

  /**
   * Create a new invoice
   */
  async create(invoice: Omit<Invoice, 'id' | 'createdAt' | 'updatedAt'>): Promise<Invoice> {
    const pool = getPool();
    const id = generateId('inv');
    const now = new Date();

    const result = await pool.query(
      `INSERT INTO invoices (
        id, tenant_id, issuer_id, issuer_account_id, issuer_details,
        recipient_id, recipient_type, recipient_details,
        student_id, student_name, enrollment_id,
        invoice_number, reference, purchase_order_number,
        issue_date, due_date, period_start, period_end,
        line_items, subtotal, discount_total, tax_total, total, amount_paid, amount_due, currency,
        status, status_history, payments, payment_plan, reminders,
        notes, internal_notes, terms,
        xero_sync, stripe_invoice_id, stripe_payment_intent_id,
        view_url, pdf_url, metadata, audit,
        created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
        $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
        $21, $22, $23, $24, $25, $26, $27, $28, $29, $30,
        $31, $32, $33, $34, $35, $36, $37, $38, $39, $40, $41
      ) RETURNING *`,
      [
        id, invoice.tenantId, invoice.issuerId, invoice.issuerAccountId,
        JSON.stringify(invoice.issuerDetails),
        invoice.recipientId, invoice.recipientType, JSON.stringify(invoice.recipientDetails),
        invoice.studentId, invoice.studentName, invoice.enrollmentId,
        invoice.invoiceNumber, invoice.reference, invoice.purchaseOrderNumber,
        invoice.issueDate, invoice.dueDate, invoice.periodStart, invoice.periodEnd,
        JSON.stringify(invoice.lineItems), invoice.subtotal, invoice.discountTotal,
        invoice.taxTotal, invoice.total, invoice.amountPaid, invoice.amountDue, invoice.currency,
        invoice.status, JSON.stringify(invoice.statusHistory), JSON.stringify(invoice.payments),
        invoice.paymentPlan ? JSON.stringify(invoice.paymentPlan) : null,
        JSON.stringify(invoice.reminders),
        invoice.notes, invoice.internalNotes, invoice.terms,
        invoice.xeroSync ? JSON.stringify(invoice.xeroSync) : null,
        invoice.stripeInvoiceId, invoice.stripePaymentIntentId,
        invoice.viewUrl, invoice.pdfUrl, JSON.stringify(invoice.metadata),
        JSON.stringify({ ...invoice.audit, createdAt: now, updatedAt: now }),
        now, now
      ]
    );

    logger.info('Invoice created', {
      invoiceId: id,
      invoiceNumber: invoice.invoiceNumber,
      tenantId: invoice.tenantId,
      total: invoice.total
    });

    return this.mapRowToInvoice(result.rows[0]);
  }

  /**
   * Update an invoice
   */
  async update(id: string, updates: Partial<Invoice>): Promise<Invoice> {
    const pool = getPool();
    const now = new Date();

    const existing = await this.findById(id);
    if (!existing) {
      throw new NotFoundError('Invoice', id);
    }

    // Build update query dynamically
    const fields: string[] = ['updated_at = $2'];
    const params: any[] = [id, now];
    let paramIndex = 3;

    const fieldMap: Record<string, string> = {
      dueDate: 'due_date',
      status: 'status',
      amountPaid: 'amount_paid',
      amountDue: 'amount_due',
      notes: 'notes',
      internalNotes: 'internal_notes',
      terms: 'terms',
      stripeInvoiceId: 'stripe_invoice_id',
      stripePaymentIntentId: 'stripe_payment_intent_id',
      viewUrl: 'view_url',
      pdfUrl: 'pdf_url'
    };

    const jsonFields = ['lineItems', 'statusHistory', 'payments', 'paymentPlan', 
                        'reminders', 'xeroSync', 'metadata', 'audit'];

    for (const [key, value] of Object.entries(updates)) {
      if (value === undefined) continue;

      if (fieldMap[key]) {
        fields.push(`${fieldMap[key]} = $${paramIndex++}`);
        params.push(value);
      } else if (jsonFields.includes(key)) {
        const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
        fields.push(`${snakeKey} = $${paramIndex++}`);
        params.push(value ? JSON.stringify(value) : null);
      }
    }

    // Recalculate totals if line items changed
    if (updates.lineItems) {
      const { subtotal, discountTotal, taxTotal, total } = this.calculateTotals(updates.lineItems);
      fields.push(`subtotal = $${paramIndex++}`);
      params.push(subtotal);
      fields.push(`discount_total = $${paramIndex++}`);
      params.push(discountTotal);
      fields.push(`tax_total = $${paramIndex++}`);
      params.push(taxTotal);
      fields.push(`total = $${paramIndex++}`);
      params.push(total);
      fields.push(`amount_due = $${paramIndex++}`);
      params.push(total - (updates.amountPaid ?? existing.amountPaid));
    }

    const result = await pool.query(
      `UPDATE invoices SET ${fields.join(', ')} WHERE id = $1 RETURNING *`,
      params
    );

    logger.info('Invoice updated', { invoiceId: id, fields: Object.keys(updates) });

    return this.mapRowToInvoice(result.rows[0]);
  }

  /**
   * Delete an invoice (only drafts can be deleted)
   */
  async delete(id: string): Promise<void> {
    const pool = getPool();
    
    const existing = await this.findById(id);
    if (!existing) {
      throw new NotFoundError('Invoice', id);
    }

    if (existing.status !== 'draft') {
      throw new ValidationError('Only draft invoices can be deleted', 'status');
    }

    await pool.query(`DELETE FROM invoices WHERE id = $1`, [id]);
    logger.info('Invoice deleted', { invoiceId: id });
  }

  /**
   * Update invoice status
   */
  async updateStatus(
    id: string, 
    status: InvoiceStatus, 
    reason?: string, 
    userId?: string
  ): Promise<Invoice> {
    const pool = getPool();
    const now = new Date();

    const existing = await this.findById(id);
    if (!existing) {
      throw new NotFoundError('Invoice', id);
    }

    // Add to status history
    const statusChange: InvoiceStatusChange = {
      status,
      changedAt: now,
      changedBy: userId || 'system',
      reason: reason || null
    };

    const statusHistory = [...existing.statusHistory, statusChange];

    const result = await pool.query(
      `UPDATE invoices SET status = $1, status_history = $2, updated_at = $3 
       WHERE id = $4 RETURNING *`,
      [status, JSON.stringify(statusHistory), now, id]
    );

    logger.info('Invoice status updated', { 
      invoiceId: id, 
      previousStatus: existing.status,
      newStatus: status 
    });

    return this.mapRowToInvoice(result.rows[0]);
  }

  /**
   * Add line item to invoice
   */
  async addLineItem(
    invoiceId: string, 
    lineItem: Omit<InvoiceLineItem, 'id'>
  ): Promise<InvoiceLineItem> {
    const invoice = await this.findById(invoiceId);
    if (!invoice) {
      throw new NotFoundError('Invoice', invoiceId);
    }

    if (invoice.status !== 'draft') {
      throw new ValidationError('Can only add line items to draft invoices', 'status');
    }

    const newLineItem: InvoiceLineItem = {
      ...lineItem,
      id: generateId('li')
    };

    const lineItems = [...invoice.lineItems, newLineItem];
    await this.update(invoiceId, { lineItems });

    return newLineItem;
  }

  /**
   * Update line item
   */
  async updateLineItem(
    invoiceId: string, 
    lineItemId: string, 
    updates: Partial<InvoiceLineItem>
  ): Promise<InvoiceLineItem> {
    const invoice = await this.findById(invoiceId);
    if (!invoice) {
      throw new NotFoundError('Invoice', invoiceId);
    }

    const lineItemIndex = invoice.lineItems.findIndex(li => li.id === lineItemId);
    if (lineItemIndex === -1) {
      throw new NotFoundError('LineItem', lineItemId);
    }

    const updatedLineItem = { ...invoice.lineItems[lineItemIndex], ...updates };
    const lineItems = [...invoice.lineItems];
    lineItems[lineItemIndex] = updatedLineItem;

    await this.update(invoiceId, { lineItems });

    return updatedLineItem;
  }

  /**
   * Remove line item
   */
  async removeLineItem(invoiceId: string, lineItemId: string): Promise<void> {
    const invoice = await this.findById(invoiceId);
    if (!invoice) {
      throw new NotFoundError('Invoice', invoiceId);
    }

    if (invoice.status !== 'draft') {
      throw new ValidationError('Can only remove line items from draft invoices', 'status');
    }

    const lineItems = invoice.lineItems.filter(li => li.id !== lineItemId);
    await this.update(invoiceId, { lineItems });
  }

  /**
   * Recalculate invoice totals
   */
  async recalculateTotals(invoiceId: string): Promise<Invoice> {
    const invoice = await this.findById(invoiceId);
    if (!invoice) {
      throw new NotFoundError('Invoice', invoiceId);
    }

    const { subtotal, discountTotal, taxTotal, total } = this.calculateTotals(invoice.lineItems);
    const amountDue = total - invoice.amountPaid;

    return this.update(invoiceId, { 
      lineItems: invoice.lineItems, // Triggers recalculation
      amountDue 
    });
  }

  /**
   * Add payment to invoice
   */
  async addPayment(
    invoiceId: string, 
    payment: Omit<InvoicePayment, 'id'>
  ): Promise<InvoicePayment> {
    return withTransaction(async (client) => {
      const invoice = await this.findById(invoiceId);
      if (!invoice) {
        throw new NotFoundError('Invoice', invoiceId);
      }

      const newPayment: InvoicePayment = {
        ...payment,
        id: generateId('pay')
      };

      const payments = [...invoice.payments, newPayment];
      const totalPaid = payments
        .filter(p => p.status === 'succeeded')
        .reduce((sum, p) => sum + p.amount, 0);

      const amountPaid = totalPaid;
      const amountDue = invoice.total - amountPaid;

      // Determine new status
      let status: InvoiceStatus = invoice.status;
      if (amountDue <= 0) {
        status = 'paid';
      } else if (amountPaid > 0) {
        status = 'partial';
      }

      await this.update(invoiceId, { payments, amountPaid, amountDue, status });

      logger.info('Payment added to invoice', { 
        invoiceId, 
        paymentId: newPayment.id, 
        amount: payment.amount 
      });

      return newPayment;
    });
  }

  /**
   * Update payment
   */
  async updatePayment(
    invoiceId: string, 
    paymentId: string, 
    updates: Partial<InvoicePayment>
  ): Promise<InvoicePayment> {
    const invoice = await this.findById(invoiceId);
    if (!invoice) {
      throw new NotFoundError('Invoice', invoiceId);
    }

    const paymentIndex = invoice.payments.findIndex(p => p.id === paymentId);
    if (paymentIndex === -1) {
      throw new NotFoundError('Payment', paymentId);
    }

    const updatedPayment = { ...invoice.payments[paymentIndex], ...updates };
    const payments = [...invoice.payments];
    payments[paymentIndex] = updatedPayment;

    // Recalculate totals
    const totalPaid = payments
      .filter(p => p.status === 'succeeded')
      .reduce((sum, p) => sum + p.amount, 0);

    const amountPaid = totalPaid;
    const amountDue = invoice.total - amountPaid;

    let status: InvoiceStatus = invoice.status;
    if (amountDue <= 0) {
      status = 'paid';
    } else if (amountPaid > 0) {
      status = 'partial';
    }

    await this.update(invoiceId, { payments, amountPaid, amountDue, status });

    return updatedPayment;
  }

  /**
   * Add reminder
   */
  async addReminder(
    invoiceId: string, 
    reminder: Omit<InvoiceReminder, 'id'>
  ): Promise<InvoiceReminder> {
    const invoice = await this.findById(invoiceId);
    if (!invoice) {
      throw new NotFoundError('Invoice', invoiceId);
    }

    const newReminder: InvoiceReminder = {
      ...reminder,
      id: generateId('rem')
    };

    const reminders = [...invoice.reminders, newReminder];
    await this.update(invoiceId, { reminders });

    return newReminder;
  }

  /**
   * Set payment plan
   */
  async setPaymentPlan(invoiceId: string, plan: InvoicePaymentPlan): Promise<void> {
    const invoice = await this.findById(invoiceId);
    if (!invoice) {
      throw new NotFoundError('Invoice', invoiceId);
    }

    await this.update(invoiceId, { paymentPlan: plan });
    logger.info('Payment plan set', { invoiceId, planId: plan.planId });
  }

  /**
   * Update payment plan
   */
  async updatePaymentPlan(invoiceId: string, updates: Partial<InvoicePaymentPlan>): Promise<void> {
    const invoice = await this.findById(invoiceId);
    if (!invoice) {
      throw new NotFoundError('Invoice', invoiceId);
    }

    if (!invoice.paymentPlan) {
      throw new ValidationError('Invoice has no payment plan', 'paymentPlan');
    }

    const updatedPlan = { ...invoice.paymentPlan, ...updates };
    await this.update(invoiceId, { paymentPlan: updatedPlan });
  }

  /**
   * Update Xero sync status
   */
  async updateXeroSync(invoiceId: string, sync: InvoiceXeroSync): Promise<void> {
    await this.update(invoiceId, { xeroSync: sync });
  }

  /**
   * Get overdue invoices
   */
  async getOverdueInvoices(tenantId: string, limit: number = 100): Promise<Invoice[]> {
    const pool = getPool();
    const result = await pool.query(
      `SELECT * FROM invoices 
       WHERE tenant_id = $1 
       AND due_date < NOW() 
       AND status IN ('sent', 'viewed', 'partial')
       ORDER BY due_date ASC
       LIMIT $2`,
      [tenantId, limit]
    );

    return result.rows.map(row => this.mapRowToInvoice(row));
  }

  /**
   * Get invoices due within X days
   */
  async getUpcomingDueInvoices(tenantId: string, days: number): Promise<Invoice[]> {
    const pool = getPool();
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + days);

    const result = await pool.query(
      `SELECT * FROM invoices 
       WHERE tenant_id = $1 
       AND due_date BETWEEN NOW() AND $2
       AND status IN ('sent', 'viewed', 'partial')
       ORDER BY due_date ASC`,
      [tenantId, futureDate]
    );

    return result.rows.map(row => this.mapRowToInvoice(row));
  }

  /**
   * Get invoice summary for account
   */
  async getInvoiceSummary(accountId: string): Promise<InvoiceSummary> {
    const pool = getPool();
    const result = await pool.query(
      `SELECT 
        COUNT(*) as total_invoices,
        SUM(total) as total_amount,
        SUM(amount_paid) as paid_amount,
        SUM(amount_due) as outstanding_amount,
        SUM(CASE WHEN due_date < NOW() AND status NOT IN ('paid', 'void', 'written_off') 
            THEN amount_due ELSE 0 END) as overdue_amount,
        COUNT(CASE WHEN due_date < NOW() AND status NOT IN ('paid', 'void', 'written_off') 
            THEN 1 END) as overdue_count,
        AVG(CASE WHEN status = 'paid' 
            THEN EXTRACT(EPOCH FROM (updated_at - issue_date))/86400 END) as avg_payment_days
       FROM invoices 
       WHERE issuer_id = $1`,
      [accountId]
    );

    const row = result.rows[0];
    return {
      totalInvoices: parseInt(row.total_invoices) || 0,
      totalAmount: parseInt(row.total_amount) || 0,
      paidAmount: parseInt(row.paid_amount) || 0,
      outstandingAmount: parseInt(row.outstanding_amount) || 0,
      overdueAmount: parseInt(row.overdue_amount) || 0,
      overdueCount: parseInt(row.overdue_count) || 0,
      averagePaymentDays: parseFloat(row.avg_payment_days) || 0
    };
  }

  /**
   * Get next invoice number sequence
   */
  async getNextInvoiceNumber(accountId: string): Promise<number> {
    const pool = getPool();
    const result = await pool.query(
      `SELECT COALESCE(MAX(
        CAST(NULLIF(regexp_replace(invoice_number, '[^0-9]', '', 'g'), '') AS INTEGER)
      ), 0) + 1 as next_number
       FROM invoices 
       WHERE issuer_id = $1`,
      [accountId]
    );

    return parseInt(result.rows[0].next_number) || 1;
  }

  // =========================================================================
  // PRIVATE METHODS
  // =========================================================================

  private calculateTotals(lineItems: InvoiceLineItem[]): { 
    subtotal: number; 
    discountTotal: number; 
    taxTotal: number; 
    total: number 
  } {
    let subtotal = 0;
    let discountTotal = 0;
    let taxTotal = 0;

    for (const item of lineItems) {
      const lineAmount = item.quantity * item.unitPrice;
      const lineDiscount = item.discountAmount || 
        (item.discountPercentage ? Math.round(lineAmount * item.discountPercentage / 100) : 0);
      const lineSubtotal = lineAmount - lineDiscount;
      const lineTax = item.taxAmount || Math.round(lineSubtotal * (item.taxRate || 0) / 100);

      subtotal += lineSubtotal;
      discountTotal += lineDiscount;
      taxTotal += lineTax;
    }

    const total = subtotal + taxTotal;

    return { subtotal, discountTotal, taxTotal, total };
  }

  private mapRowToInvoice(row: any): Invoice {
    return {
      id: row.id,
      tenantId: row.tenant_id,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      issuerId: row.issuer_id,
      issuerAccountId: row.issuer_account_id,
      issuerDetails: row.issuer_details as InvoicePartyDetails,
      recipientId: row.recipient_id,
      recipientType: row.recipient_type,
      recipientDetails: row.recipient_details as InvoicePartyDetails,
      studentId: row.student_id,
      studentName: row.student_name,
      enrollmentId: row.enrollment_id,
      invoiceNumber: row.invoice_number,
      reference: row.reference,
      purchaseOrderNumber: row.purchase_order_number,
      issueDate: row.issue_date,
      dueDate: row.due_date,
      periodStart: row.period_start,
      periodEnd: row.period_end,
      lineItems: row.line_items as InvoiceLineItem[],
      subtotal: row.subtotal,
      discountTotal: row.discount_total,
      taxTotal: row.tax_total,
      total: row.total,
      amountPaid: row.amount_paid,
      amountDue: row.amount_due,
      currency: row.currency,
      status: row.status,
      statusHistory: row.status_history as InvoiceStatusChange[],
      payments: row.payments as InvoicePayment[],
      paymentPlan: row.payment_plan as InvoicePaymentPlan | null,
      reminders: row.reminders as InvoiceReminder[],
      notes: row.notes,
      internalNotes: row.internal_notes,
      terms: row.terms,
      xeroSync: row.xero_sync as InvoiceXeroSync | null,
      stripeInvoiceId: row.stripe_invoice_id,
      stripePaymentIntentId: row.stripe_payment_intent_id,
      viewUrl: row.view_url,
      pdfUrl: row.pdf_url,
      metadata: row.metadata,
      audit: row.audit
    };
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

let repository: InvoiceRepository | null = null;

export function getInvoiceRepository(): InvoiceRepository {
  if (!repository) {
    repository = new PostgresInvoiceRepository();
  }
  return repository;
}

export function setInvoiceRepository(repo: InvoiceRepository): void {
  repository = repo;
}
