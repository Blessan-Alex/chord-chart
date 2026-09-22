import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:google_sign_in/google_sign_in.dart';
import 'package:lf_chords/core/routing/route_paths.dart';
import 'package:lf_chords/firebase_options.dart';

Future<void> bootstrapFirebase() async {
  await Firebase.initializeApp(
    options: DefaultFirebaseOptions.currentPlatform,
  );

  FirebaseFirestore.instance.settings = const Settings(
    persistenceEnabled: true,
  );

  await GoogleSignIn.instance.initialize(
    serverClientId: googleSignInWebClientId,
  );
}
