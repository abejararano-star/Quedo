import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';

class SavedListings extends ChangeNotifier {
  SavedListings(this._preferences, String origin)
    : _key = 'quedo.saved.$origin';

  final SharedPreferencesAsync _preferences;
  final String _key;
  List<String> _slugs = [];
  bool _writing = false;

  List<String> get slugs => List.unmodifiable(_slugs);
  bool contains(String slug) => _slugs.contains(slug);

  Future<void> load() async {
    _slugs = (await _preferences.getStringList(_key) ?? []).take(60).toList();
    notifyListeners();
  }

  Future<void> toggle(String slug) async {
    if (_writing) return;
    _writing = true;
    try {
      final next = contains(slug)
          ? _slugs.where((value) => value != slug).toList()
          : [slug, ..._slugs].take(60).toList();
      await _preferences.setStringList(_key, next);
      _slugs = next;
      notifyListeners();
    } finally {
      _writing = false;
    }
  }
}
