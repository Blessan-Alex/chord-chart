import 'package:flutter/material.dart';
import 'package:lf_chords/domain/group.dart';

class MemberPills extends StatelessWidget {
  const MemberPills({
    super.key,
    required this.members,
    this.maxVisible = 8,
  });

  final List<GroupMemberInfo> members;
  final int maxVisible;

  @override
  Widget build(BuildContext context) {
    final visible = members.take(maxVisible).toList();
    return Wrap(
      spacing: 8,
      runSpacing: 8,
      children: visible.map((member) {
        final label = member.username?.isNotEmpty == true
            ? '@${member.username}'
            : member.displayName;
        return Chip(label: Text(label));
      }).toList(),
    );
  }
}
