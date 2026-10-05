import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import '../services/supabase_service.dart';
import '../models/event.dart';

class BudgetAnalyticsScreen extends StatefulWidget {
  const BudgetAnalyticsScreen({super.key});

  @override
  State<BudgetAnalyticsScreen> createState() => _BudgetAnalyticsScreenState();
}

class _BudgetAnalyticsScreenState extends State<BudgetAnalyticsScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;
  late Future<List<EventModel>> _eventsFuture;
  EventModel? _selectedEvent;
  Map<String, dynamic>? _analytics;
  bool _loadingAnalytics = false;
  final _currencyFmt = NumberFormat('#,##0', 'en_US');

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    _eventsFuture = context.read<SupabaseService>().fetchEvents();
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  Future<void> _loadAnalytics(EventModel event) async {
    setState(() {
      _selectedEvent = event;
      _loadingAnalytics = true;
      _analytics = null;
    });
    final result = await context.read<SupabaseService>().fetchBudgetAnalytics(event.id);
    if (mounted) setState(() { _analytics = result; _loadingAnalytics = false; });
  }

  void _showCreateBudgetDialog() {
    if (_selectedEvent == null) return;
    final ctrl = TextEditingController(text: '500000');
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: const Color(0xFF0F172A),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: const Text('Set Event Budget', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Text('Enter the total budget (LKR) for this event:', style: TextStyle(color: Color(0xFF94A3B8), fontSize: 12)),
            const SizedBox(height: 14),
            TextField(
              controller: ctrl,
              keyboardType: TextInputType.number,
              style: const TextStyle(color: Colors.white),
              decoration: InputDecoration(
                prefixText: 'LKR ',
                prefixStyle: const TextStyle(color: Color(0xFF60A5FA)),
                filled: true,
                fillColor: const Color(0xFF030712),
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
              ),
            ),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel', style: TextStyle(color: Color(0xFF64748B)))),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF2563EB)),
            onPressed: () async {
              Navigator.pop(ctx);
              final amount = double.tryParse(ctrl.text.replaceAll(',', '')) ?? 0;
              if (amount <= 0) return;
              final res = await context.read<SupabaseService>().createBudgetForEvent(_selectedEvent!.id, amount);
              if (mounted) {
                ScaffoldMessenger.of(context).showSnackBar(SnackBar(
                  content: Text(res['success'] == true ? '✅ Budget set: LKR ${_currencyFmt.format(amount)}' : '❌ ${res['error']}'),
                  backgroundColor: res['success'] == true ? const Color(0xFF10B981) : const Color(0xFFDC2626),
                ));
                if (res['success'] == true) _loadAnalytics(_selectedEvent!);
              }
            },
            child: const Text('Set Budget', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
          ),
        ],
      ),
    );
  }

  void _showAddExpenseDialog() {
    final analytics = _analytics;
    if (analytics == null || analytics['hasBudget'] != true) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Set a budget first before adding expenses.'), backgroundColor: Color(0xFFF59E0B)),
      );
      return;
    }
    final budgetId = analytics['budgetId'] as String?;
    if (budgetId == null) return;

    final amountCtrl = TextEditingController();
    String selectedCategory = 'Venue';
    final categories = ['Venue', 'Catering', 'Audio/Visual', 'Security', 'Marketing', 'Staff', 'Other'];

    showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(builder: (ctx2, setDialogState) => AlertDialog(
        backgroundColor: const Color(0xFF0F172A),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: const Row(
          children: [
            Icon(Icons.receipt_long, color: Color(0xFFF59E0B), size: 20),
            SizedBox(width: 8),
            Text('Log Expense', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 16)),
          ],
        ),
        content: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text('Category', style: TextStyle(color: Color(0xFF94A3B8), fontSize: 11)),
              const SizedBox(height: 6),
              DropdownButtonFormField<String>(
                value: selectedCategory,
                dropdownColor: const Color(0xFF0F172A),
                style: const TextStyle(color: Colors.white, fontSize: 13),
                decoration: InputDecoration(
                  filled: true,
                  fillColor: const Color(0xFF030712),
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                  contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                ),
                items: categories.map((c) => DropdownMenuItem(value: c, child: Text(c))).toList(),
                onChanged: (v) => setDialogState(() => selectedCategory = v ?? 'Other'),
              ),
              const SizedBox(height: 12),
              const Text('Amount (LKR)', style: TextStyle(color: Color(0xFF94A3B8), fontSize: 11)),
              const SizedBox(height: 6),
              TextField(
                controller: amountCtrl,
                keyboardType: TextInputType.number,
                style: const TextStyle(color: Colors.white),
                decoration: InputDecoration(
                  hintText: '0',
                  hintStyle: const TextStyle(color: Color(0xFF475569)),
                  prefixText: 'LKR ',
                  prefixStyle: const TextStyle(color: Color(0xFF60A5FA)),
                  filled: true,
                  fillColor: const Color(0xFF030712),
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                ),
              ),
              const SizedBox(height: 10),
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: const Color(0xFFF59E0B).withValues(alpha: 0.08),
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: const Color(0xFFF59E0B).withValues(alpha: 0.3)),
                ),
                child: const Row(
                  children: [
                    Icon(Icons.info_outline, color: Color(0xFFF59E0B), size: 14),
                    SizedBox(width: 6),
                    Expanded(
                      child: Text(
                        'Expenses above LKR 50,000 are auto-flagged for human approval.',
                        style: TextStyle(color: Color(0xFFF59E0B), fontSize: 10),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx2), child: const Text('Cancel', style: TextStyle(color: Color(0xFF64748B)))),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFFF59E0B)),
            onPressed: () async {
              Navigator.pop(ctx2);
              final amount = double.tryParse(amountCtrl.text.replaceAll(',', '')) ?? 0;
              if (amount <= 0) return;
              final res = await context.read<SupabaseService>().addExpense(
                budgetId: budgetId,
                category: selectedCategory,
                amount: amount,
              );
              if (mounted) {
                final flagged = res['requiresApproval'] == true;
                ScaffoldMessenger.of(context).showSnackBar(SnackBar(
                  content: Text(flagged
                      ? '⚠️ Expense logged & flagged for approval (above LKR 50,000 threshold)'
                      : '✅ Expense logged: LKR ${_currencyFmt.format(amount)} — $selectedCategory'),
                  backgroundColor: flagged ? const Color(0xFFF59E0B) : const Color(0xFF10B981),
                  duration: const Duration(seconds: 4),
                ));
                _loadAnalytics(_selectedEvent!);
              }
            },
            child: const Text('Log Expense', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
          ),
        ],
      )),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF050811),
      appBar: AppBar(
        title: const Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Budget & Payments', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 17)),
            Text('Budget vs. Actual · Expense Tracking', style: TextStyle(color: Color(0xFF94A3B8), fontSize: 11)),
          ],
        ),
        backgroundColor: const Color(0xFF0B0F19),
        foregroundColor: Colors.white,
        elevation: 0,
        actions: [
          if (_selectedEvent != null && _analytics != null && _analytics!['hasBudget'] == true)
            IconButton(
              icon: const Icon(Icons.add_circle, color: Color(0xFFF59E0B)),
              tooltip: 'Log Expense',
              onPressed: _showAddExpenseDialog,
            ),
          if (_selectedEvent != null && (_analytics == null || _analytics!['hasBudget'] != true))
            IconButton(
              icon: const Icon(Icons.account_balance_wallet, color: Color(0xFF60A5FA)),
              tooltip: 'Set Budget',
              onPressed: _showCreateBudgetDialog,
            ),
        ],
        bottom: TabBar(
          controller: _tabController,
          indicatorColor: const Color(0xFF60A5FA),
          labelColor: Colors.white,
          unselectedLabelColor: const Color(0xFF64748B),
          tabs: const [
            Tab(text: 'Analytics'),
            Tab(text: 'Expenses'),
          ],
        ),
      ),
      body: Column(
        children: [
          _buildEventPicker(),
          Expanded(
            child: _selectedEvent == null
                ? const Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(Icons.account_balance_wallet_outlined, color: Color(0xFF334155), size: 56),
                        SizedBox(height: 14),
                        Text('Select an event above\nto view its budget analytics', textAlign: TextAlign.center, style: TextStyle(color: Color(0xFF64748B), fontSize: 13)),
                      ],
                    ),
                  )
                : _loadingAnalytics
                    ? const Center(child: CircularProgressIndicator(color: Color(0xFF3B82F6)))
                    : TabBarView(
                        controller: _tabController,
                        children: [
                          _buildAnalyticsTab(),
                          _buildExpensesTab(),
                        ],
                      ),
          ),
        ],
      ),
    );
  }

  Widget _buildEventPicker() {
    return FutureBuilder<List<EventModel>>(
      future: _eventsFuture,
      builder: (ctx, snap) {
        if (snap.connectionState == ConnectionState.waiting) {
          return const Padding(
            padding: EdgeInsets.all(16),
            child: LinearProgressIndicator(color: Color(0xFF3B82F6)),
          );
        }
        final events = snap.data ?? [];
        if (events.isEmpty) return const SizedBox.shrink();
        return Container(
          margin: const EdgeInsets.all(16),
          padding: const EdgeInsets.symmetric(horizontal: 14),
          decoration: BoxDecoration(
            color: const Color(0xFF0F172A),
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: Colors.white.withValues(alpha: 0.1)),
          ),
          child: DropdownButtonHideUnderline(
            child: DropdownButton<EventModel>(
              value: _selectedEvent,
              hint: const Text('Select Event', style: TextStyle(color: Color(0xFF64748B), fontSize: 13)),
              dropdownColor: const Color(0xFF0F172A),
              isExpanded: true,
              style: const TextStyle(color: Colors.white, fontSize: 13),
              icon: const Icon(Icons.keyboard_arrow_down, color: Color(0xFF60A5FA)),
              items: events.map((e) => DropdownMenuItem<EventModel>(
                value: e,
                child: Text(e.title, overflow: TextOverflow.ellipsis),
              )).toList(),
              onChanged: (e) { if (e != null) _loadAnalytics(e); },
            ),
          ),
        );
      },
    );
  }

  Widget _buildAnalyticsTab() {
    final a = _analytics;
    if (a == null) return const SizedBox.shrink();

    if (a['hasBudget'] != true) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.account_balance_wallet_outlined, color: Color(0xFF334155), size: 56),
            const SizedBox(height: 14),
            const Text('No budget set for this event yet', style: TextStyle(color: Color(0xFF94A3B8), fontSize: 14)),
            const SizedBox(height: 16),
            ElevatedButton.icon(
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF2563EB),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
              ),
              onPressed: _showCreateBudgetDialog,
              icon: const Icon(Icons.add, color: Colors.white, size: 18),
              label: const Text('Set Budget', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
            ),
          ],
        ),
      );
    }

    final total = (a['totalBudget'] as num?)?.toDouble() ?? 0;
    final spent = (a['spent'] as num?)?.toDouble() ?? 0;
    final pending = (a['pending'] as num?)?.toDouble() ?? 0;
    final remaining = (a['remaining'] as num?)?.toDouble() ?? 0;
    final utilizationPct = (a['utilizationPct'] as num?)?.toDouble() ?? 0;
    final byCategory = (a['byCategory'] as List?)?.cast<Map<String, dynamic>>() ?? [];
    final flagged = (a['flaggedExpenses'] as List?)?.cast<Map<String, dynamic>>() ?? [];

    return SingleChildScrollView(
      padding: const EdgeInsets.fromLTRB(16, 4, 16, 24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.all(18),
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                colors: [Color(0xFF1E40AF), Color(0xFF0F172A)],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: const Color(0xFF2563EB).withValues(alpha: 0.4)),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('TOTAL BUDGET', style: TextStyle(color: Color(0xFF93C5FD), fontSize: 10, letterSpacing: 1.2, fontWeight: FontWeight.bold)),
                const SizedBox(height: 4),
                Text('LKR ${_currencyFmt.format(total)}', style: const TextStyle(color: Colors.white, fontSize: 26, fontWeight: FontWeight.w900)),
                const SizedBox(height: 14),
                ClipRRect(
                  borderRadius: BorderRadius.circular(6),
                  child: LinearProgressIndicator(
                    value: utilizationPct / 100,
                    minHeight: 8,
                    backgroundColor: Colors.white.withValues(alpha: 0.15),
                    valueColor: AlwaysStoppedAnimation<Color>(
                      utilizationPct > 85 ? const Color(0xFFEF4444) : utilizationPct > 60 ? const Color(0xFFF59E0B) : const Color(0xFF10B981),
                    ),
                  ),
                ),
                const SizedBox(height: 8),
                Text('${utilizationPct.toStringAsFixed(1)}% utilized', style: const TextStyle(color: Color(0xFF93C5FD), fontSize: 11)),
              ],
            ),
          ),
          const SizedBox(height: 14),

          GridView.count(
            crossAxisCount: 2,
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            mainAxisSpacing: 10,
            crossAxisSpacing: 10,
            childAspectRatio: 1.6,
            children: [
              _metricCard('SPENT', 'LKR ${_currencyFmt.format(spent)}', Icons.payments_outlined, const Color(0xFF10B981)),
              _metricCard('PENDING', 'LKR ${_currencyFmt.format(pending)}', Icons.hourglass_top, const Color(0xFFF59E0B)),
              _metricCard('REMAINING', 'LKR ${_currencyFmt.format(remaining)}', Icons.savings_outlined, const Color(0xFF60A5FA)),
              _metricCard('FLAGGED', '${flagged.length} items', Icons.flag_outlined, const Color(0xFFEF4444)),
            ],
          ),
          const SizedBox(height: 20),

          if (flagged.isNotEmpty) ...[
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: const Color(0xFFEF4444).withValues(alpha: 0.08),
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: const Color(0xFFEF4444).withValues(alpha: 0.4)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      const Icon(Icons.flag, color: Color(0xFFEF4444), size: 16),
                      const SizedBox(width: 8),
                      Text('${flagged.length} Expense${flagged.length > 1 ? 's' : ''} Flagged for Approval',
                          style: const TextStyle(color: Color(0xFFEF4444), fontSize: 13, fontWeight: FontWeight.bold)),
                    ],
                  ),
                  const SizedBox(height: 6),
                  const Text('These exceed the LKR 50,000 auto-approve threshold and require human approval.',
                      style: TextStyle(color: Color(0xFFF87171), fontSize: 11)),
                  const SizedBox(height: 10),
                  ...flagged.map((exp) => Padding(
                    padding: const EdgeInsets.only(bottom: 6),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(exp['Category']?.toString() ?? 'Expense', style: const TextStyle(color: Color(0xFFFCA5A5), fontSize: 12)),
                        Text('LKR ${_currencyFmt.format((exp['Amount'] as num?)?.toDouble() ?? 0)}',
                            style: const TextStyle(color: Color(0xFFEF4444), fontSize: 12, fontWeight: FontWeight.bold)),
                      ],
                    ),
                  )),
                ],
              ),
            ),
            const SizedBox(height: 16),
          ],

          if (byCategory.isNotEmpty) ...[
            const Text('SPEND BY CATEGORY', style: TextStyle(color: Color(0xFF64748B), fontSize: 10, letterSpacing: 1.2, fontWeight: FontWeight.bold)),
            const SizedBox(height: 10),
            ...byCategory.map((cat) {
              final catAmt = (cat['total'] as num?)?.toDouble() ?? 0;
              final pct = total > 0 ? catAmt / total : 0.0;
              return _buildCategoryRow(cat['category']?.toString() ?? 'Other', catAmt, pct);
            }),
          ],
        ],
      ),
    );
  }

  Widget _buildCategoryRow(String name, double amount, double pct) {
    const colors = [Color(0xFF60A5FA), Color(0xFF34D399), Color(0xFFF59E0B), Color(0xFFA78BFA), Color(0xFFFB7185), Color(0xFF22D3EE)];
    final color = colors[name.hashCode.abs() % colors.length];
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: const Color(0xFF0F172A),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.white.withValues(alpha: 0.07)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(children: [
                Container(width: 8, height: 8, decoration: BoxDecoration(color: color, shape: BoxShape.circle)),
                const SizedBox(width: 8),
                Text(name, style: const TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.w600)),
              ]),
              Text('LKR ${_currencyFmt.format(amount)}', style: TextStyle(color: color, fontSize: 12, fontWeight: FontWeight.bold)),
            ],
          ),
          const SizedBox(height: 8),
          ClipRRect(
            borderRadius: BorderRadius.circular(4),
            child: LinearProgressIndicator(
              value: pct.toDouble(),
              minHeight: 5,
              backgroundColor: Colors.white.withValues(alpha: 0.08),
              valueColor: AlwaysStoppedAnimation<Color>(color),
            ),
          ),
          const SizedBox(height: 4),
          Text('${(pct * 100).toStringAsFixed(1)}% of total budget', style: const TextStyle(color: Color(0xFF64748B), fontSize: 10)),
        ],
      ),
    );
  }

  Widget _buildExpensesTab() {
    final a = _analytics;
    if (a == null || a['hasBudget'] != true) {
      return const Center(child: Text('No budget set. Create a budget first.', style: TextStyle(color: Color(0xFF64748B))));
    }
    final expenses = (a['expenses'] as List?)?.cast<Map<String, dynamic>>() ?? [];
    if (expenses.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.receipt_long_outlined, color: Color(0xFF334155), size: 48),
            const SizedBox(height: 12),
            const Text('No expenses logged yet', style: TextStyle(color: Color(0xFF64748B))),
            const SizedBox(height: 16),
            ElevatedButton.icon(
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFFF59E0B),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
              onPressed: _showAddExpenseDialog,
              icon: const Icon(Icons.add, color: Colors.white),
              label: const Text('Log First Expense', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
            ),
          ],
        ),
      );
    }
    return ListView.builder(
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
      itemCount: expenses.length,
      itemBuilder: (ctx, i) {
        final exp = expenses[i];
        final status = exp['Status']?.toString() ?? 'Pending';
        final amount = (exp['Amount'] as num?)?.toDouble() ?? 0;
        final isFlagged = amount > 50000;
        final statusColor = status == 'Approved' || status == 'Paid'
            ? const Color(0xFF10B981)
            : status == 'Rejected'
                ? const Color(0xFFEF4444)
                : const Color(0xFFF59E0B);
        return Container(
          margin: const EdgeInsets.only(bottom: 10),
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: const Color(0xFF0F172A),
            borderRadius: BorderRadius.circular(14),
            border: Border.all(
              color: isFlagged ? const Color(0xFFEF4444).withValues(alpha: 0.4) : Colors.white.withValues(alpha: 0.08),
            ),
          ),
          child: Row(
            children: [
              Container(
                width: 40,
                height: 40,
                decoration: BoxDecoration(color: statusColor.withValues(alpha: 0.12), shape: BoxShape.circle),
                child: Icon(_getCategoryIcon(exp['Category']?.toString() ?? ''), color: statusColor, size: 18),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(children: [
                      Text(exp['Category']?.toString() ?? 'Expense',
                          style: const TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.bold)),
                      if (isFlagged) ...[
                        const SizedBox(width: 6),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
                          decoration: BoxDecoration(color: const Color(0xFFEF4444).withValues(alpha: 0.2), borderRadius: BorderRadius.circular(4)),
                          child: const Text('⚠️ Flagged', style: TextStyle(color: Color(0xFFEF4444), fontSize: 9, fontWeight: FontWeight.bold)),
                        ),
                      ],
                    ]),
                    const SizedBox(height: 3),
                    Text(_formatDate(exp['CreatedAt']?.toString() ?? ''), style: const TextStyle(color: Color(0xFF64748B), fontSize: 10)),
                  ],
                ),
              ),
              Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Text('LKR ${_currencyFmt.format(amount)}', style: const TextStyle(color: Colors.white, fontSize: 14, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 3),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                    decoration: BoxDecoration(
                      color: statusColor.withValues(alpha: 0.12),
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: statusColor.withValues(alpha: 0.4)),
                    ),
                    child: Text(status, style: TextStyle(color: statusColor, fontSize: 10, fontWeight: FontWeight.bold)),
                  ),
                ],
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _metricCard(String label, String value, IconData icon, Color color) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: const Color(0xFF0F172A),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: color.withValues(alpha: 0.2)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(label, style: const TextStyle(color: Color(0xFF64748B), fontSize: 9, fontWeight: FontWeight.bold, letterSpacing: 0.8)),
              Icon(icon, color: color, size: 16),
            ],
          ),
          const Spacer(),
          Text(value, style: TextStyle(color: color, fontSize: 14, fontWeight: FontWeight.w900)),
        ],
      ),
    );
  }

  IconData _getCategoryIcon(String category) {
    switch (category.toLowerCase()) {
      case 'venue': return Icons.location_city;
      case 'catering': return Icons.restaurant;
      case 'audio/visual': return Icons.headset;
      case 'security': return Icons.security;
      case 'marketing': return Icons.campaign;
      case 'staff': return Icons.people;
      default: return Icons.receipt_long;
    }
  }

  String _formatDate(String iso) {
    if (iso.isEmpty) return '';
    try { return DateFormat('MMM d, yyyy').format(DateTime.parse(iso)); } catch (_) { return iso; }
  }
}
