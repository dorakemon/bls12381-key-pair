/*
 * Copyright 2020 - MATTR Limited
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *     http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
import { base64url } from "rfc4648";
import bs58 from "bs58";
import {
  DEFAULT_BLS12381_G1_PUBLIC_KEY_LENGTH,
  generateBls12381G1KeyPair,
} from "@zkp-ld/bbs-signatures";
import {
  JsonWebKey,
  KeyPairOptions,
  KeyPairSigner,
  KeyPairVerifier,
  GenerateKeyPairOptions,
  JwkKeyPairOptions,
  BlsCurveName,
} from "./types";
import {
  assertBls12381G1PrivateJwk,
  assertBls12381G1PublicJwk,
} from "./validators";
import { convertBase64urlToBase58 } from "./utils";

/**
 * z represents the multibase encoding scheme of base58 encoding
 * @see https://github.com/multiformats/multibase/blob/master/multibase.csv#L18
 * @ignore
 */
const MULTIBASE_ENCODED_BASE58_IDENTIFIER = "z";

/**
 * 0x01 indicates the end of the leading bytes according to variable integer spec
 * @see https://github.com/multiformats/multicodec
 * @ignore
 */
const VARIABLE_INTEGER_TRAILING_BYTE = 0x01;

/**
 * 0xea indicates a BLS 12-381 G1 public key
 *
 */
const BLS12381G1_MULTICODEC_IDENTIFIER = 0xea;

/**
 * NOTE: This function isn't properly producing signatures at this time. An update
 * needs to be made to the bbs-signatures library before this API will work properly
 * for Bls12381G1KeyPairs.
 *
 * @ignore
 * Returns an object with an async sign function for producing BBS+ signatures.
 * The sign function is bound to the KeyPair
 * and then returned by the KeyPair's signer method.
 * @param key - A Bls12381G1KeyPair.
 *
 * @returns An object with an async function sign
 * using the private key passed in.
 */
const signerFactory = (key: Bls12381G1KeyPair): KeyPairSigner => {
  throw new Error("Not Implemented");
};

/**
 * NOTE: This function isn't properly producing signatures at this time. An update
 * needs to be made to the bbs-signatures library before this API will work properly
 * for Bls12381G1KeyPairs.
 *
 * @ignore
 * Returns an object with an async verify function for verifying BBS+ signatures.
 * The verify function is bound to the KeyPair
 * and then returned by the KeyPair's verifier method.
 * @param key - A Bls12381G1KeyPair.
 *
 * @returns An async verifier specific
 * to the key passed in.
 */
const verifierFactory = (key: Bls12381G1KeyPair): KeyPairVerifier => {
  throw new Error("Not Implemented");
};

/**
 * A BLS 12-381 G1 based key pair
 */
export class Bls12381G1KeyPair {
  /**
   * The key id
   */
  readonly id?: string;
  /**
   * The key controller
   */
  readonly controller?: string;
  /**
   * Buffer containing the raw bytes of the private key
   */
  readonly privateKeyBuffer?: Uint8Array;
  /**
   * Buffer containing the raw bytes of the public key
   */
  readonly publicKeyBuffer: Uint8Array;
  /**
   * Type identifier for the key pair
   */
  readonly type: string = "Bls12381G1Key2020";

  /**
   * Default constructor.
   */
  constructor(options: KeyPairOptions) {
    /**
     * The provided publicKey needs to be 384 bits / 5.85 = 65.6
     * which means the base58 encoded publicKey can be either 65 or 66 chars
     * 5.85 = log base 2 (58) which is equivalent to the number of bits
     * encoded per character of a base58 encoded string.
     *
     */
    if (
      options.publicKeyBase58.length !== 65 &&
      options.publicKeyBase58.length !== 66
    ) {
      throw new Error(
        `The size of the public key is incorrect. Expected 65 or 66 chars got: ${options.publicKeyBase58.length}`
      );
    }

    /**
     * Validates the size of the private key if one is included
     * This is done by 256 bits / 5.85 = 43.7 which means
     * the base58 encoded privateKey can be either 43 or 44 chars
     */
    if (
      typeof options.privateKeyBase58 !== "undefined" &&
      options.privateKeyBase58.length !== 43 &&
      options.privateKeyBase58.length !== 44
    ) {
      throw new Error(
        `The size of the private key is incorrect. Expected 43 or 44 chars got: ${options.privateKeyBase58.length}`
      );
    }

    /**
     * The decoding can potentially throw an error if the input string
     * is not base58 encoded. In this case it's expected that the bs58
     * library will bubble up it's error though here rather than be
     * caught at this layer.
     */
    this.id = options.id;
    this.controller = options.controller;
    this.privateKeyBuffer = options.privateKeyBase58
      ? bs58.decode(options.privateKeyBase58)
      : undefined;
    this.publicKeyBuffer = bs58.decode(options.publicKeyBase58);
  }

  /**
   * Generates a BLS 12-381 key pair
   * @param options [Optional] options for the key pair generation
   *
   * @returns A BLS 12-381 key pair
   */
  static async generate(
    options?: GenerateKeyPairOptions
  ): Promise<Bls12381G1KeyPair> {
    // TODO: Do we want to set a minimum size input for the seed?
    const keyPair = options?.seed
      ? await generateBls12381G1KeyPair(options.seed)
      : await generateBls12381G1KeyPair();
    return new Bls12381G1KeyPair({
      ...options,
      privateKeyBase58: bs58.encode(keyPair.secretKey as Uint8Array),
      publicKeyBase58: bs58.encode(keyPair.publicKey),
    });
  }

  /**
   * Constructs a BLS 12-381 key pair from options
   * @param options [Optional] options for key pair
   *
   * @returns A BLS 12-381 key pair
   */
  static async from(options: KeyPairOptions): Promise<Bls12381G1KeyPair> {
    return new Bls12381G1KeyPair(options);
  }

  /**
   * Constructs a BLS 12-381 key pair from options
   * @param options [Optional] options for key pair
   *
   * @returns A BLS 12-381 G1 key pair
   */
  static async fromJwk(options: JwkKeyPairOptions): Promise<Bls12381G1KeyPair> {
    const { id, controller, publicKeyJwk, privateKeyJwk } = options;
    if (
      typeof privateKeyJwk !== "undefined" &&
      /**
       * The type casting is verified through the use of this assert function
       * However because the returned interface leaves the properties as optional
       * they need to be cast to pass to the convert
       **/
      assertBls12381G1PrivateJwk(privateKeyJwk)
    ) {
      return new Bls12381G1KeyPair({
        id,
        controller,
        publicKeyBase58: convertBase64urlToBase58(privateKeyJwk.x as string),
        privateKeyBase58: convertBase64urlToBase58(privateKeyJwk.d as string),
      });
    }

    if (assertBls12381G1PublicJwk(publicKeyJwk)) {
      return new Bls12381G1KeyPair({
        id,
        controller,
        publicKeyBase58: convertBase64urlToBase58(publicKeyJwk.x as string),
      });
    }

    throw Error("The JWK provided is not a valid");
  }

  /**
   * Constructs a BLS 12-381 key pair from a public key fingerprint
   * @param fingerprint [Optional] public key fingerprint
   *
   * TODO this interface needs to be refactored, there should be no
   * hard coded notion of DIDs at this layer
   *
   * @returns A BLS 12-381 key pair
   */
  static fromFingerprint({
    id,
    controller,
    fingerprint,
  }: any): Bls12381G1KeyPair {
    if (fingerprint.substr(0, 1) != MULTIBASE_ENCODED_BASE58_IDENTIFIER) {
      throw new Error(
        `Unsupported fingerprint type: expected first character to be \`z\` indicating base58 encoding, received \`${fingerprint.substr(
          0,
          1
        )}\``
      );
    }

    // parse of the multi-format public key removing the `z` that indicates base58 encoding
    const buffer = bs58.decode(fingerprint.substr(1));

    if (buffer.length !== DEFAULT_BLS12381_G1_PUBLIC_KEY_LENGTH + 2) {
      throw new Error(
        `Unsupported public key length: expected \`${DEFAULT_BLS12381_G1_PUBLIC_KEY_LENGTH}\` received \`${
          buffer.length - 2
        }\``
      );
    }

    if (buffer[0] !== BLS12381G1_MULTICODEC_IDENTIFIER) {
      throw new Error(
        `Unsupported public key identifier: expected second character to be \`${BLS12381G1_MULTICODEC_IDENTIFIER}\` indicating BLS12381G1 key pair, received \`${buffer[0]}\``
      );
    }

    if (buffer[1] !== VARIABLE_INTEGER_TRAILING_BYTE) {
      throw new Error(
        `Missing variable integer trailing byte: expected third character to be \`${VARIABLE_INTEGER_TRAILING_BYTE}\` indicating trailing integer, received \`${buffer[1]}\``
      );
    }

    const publicKeyBase58 = bs58.encode(buffer.slice(2));

    //Defaults the controller to a DID key based controller
    if (!controller) {
      controller = `did:key:${Bls12381G1KeyPair.fingerprintFromPublicKey({
        publicKeyBase58,
      })}`;
    }

    //Defaults the id to the did key based fragment
    if (!id) {
      id = `#${Bls12381G1KeyPair.fingerprintFromPublicKey({
        publicKeyBase58,
      })}`;
    }

    return new Bls12381G1KeyPair({
      id,
      controller,
      publicKeyBase58,
    });
  }

  /**
   * Returns a signer object for use with jsonld-signatures.
   *
   * @returns {{sign: Function}} A signer for the json-ld block.
   */
  signer(): KeyPairSigner {
    return signerFactory(this);
  }

  /**
   * Returns a verifier object for use with jsonld-signatures.
   *
   * @returns {{verify: Function}} Used to verify jsonld-signatures.
   */
  verifier(): KeyPairVerifier {
    return verifierFactory(this);
  }

  /**
   * Returns the base58 encoded public key.
   *
   * @returns The base58 encoded public key.
   */
  get publicKey(): string {
    return bs58.encode(this.publicKeyBuffer);
  }

  /**
   * Returns the JWK structured public key.
   *
   * @returns The JWK public key.
   */
  get publicKeyJwk(): JsonWebKey {
    return {
      kid: this.id,
      kty: "EC",
      crv: BlsCurveName.G1,
      x: base64url.stringify(this.publicKeyBuffer, { pad: false }),
    };
  }

  /**
   * Returns the base58 encoded private key.
   *
   * @returns The base58 encoded private key.
   */
  get privateKey(): string | undefined {
    if (this.privateKeyBuffer) {
      return bs58.encode(this.privateKeyBuffer);
    }
    return undefined;
  }

  /**
   * Returns the JWK formatted private key.
   *
   * @returns The JWK formatted private key.
   */
  get privateKeyJwk(): JsonWebKey | undefined {
    if (this.privateKeyBuffer) {
      return {
        kid: this.id,
        kty: "EC",
        crv: BlsCurveName.G1,
        x: base64url.stringify(this.publicKeyBuffer, { pad: false }),
        d: base64url.stringify(this.privateKeyBuffer, { pad: false }),
      };
    }
    return undefined;
  }

  /**
   * Adds a public key base to a public key node.
   *
   * @param publicKeyNode - The public key node.
   * @param publicKeyNode.publicKeyBase58 - Base58 public key.
   *
   * @returns A PublicKeyNode in a block.
   */
  addEncodedPublicKey(publicKeyNode: any): any {
    publicKeyNode.publicKeyBase58 = this.publicKey;
    return publicKeyNode;
  }

  /**
   * Generates and returns a public key fingerprint.
   *
   * @param publicKeyBase58 - The base58 encoded public key material.
   *
   * @returns The fingerprint.
   */
  static fingerprintFromPublicKey({ publicKeyBase58 }: any): string {
    const keyBytes = bs58.decode(publicKeyBase58);
    const buffer = new Uint8Array(2 + keyBytes.length);

    buffer[0] = BLS12381G1_MULTICODEC_IDENTIFIER;
    buffer[1] = VARIABLE_INTEGER_TRAILING_BYTE;
    buffer.set(keyBytes, 2);

    return `${MULTIBASE_ENCODED_BASE58_IDENTIFIER}${bs58.encode(buffer)}`;
  }

  /**
   * Generates and returns a public key fingerprint.
   *
   * @returns The fingerprint.
   */
  fingerprint(): string {
    const publicKeyBase58 = this.publicKey;
    return Bls12381G1KeyPair.fingerprintFromPublicKey({ publicKeyBase58 });
  }

  /**
   * Verifies whether the fingerprint was generated from a given key pair.
   *
   * @param fingerprint - A Base58 public key.
   *
   * @returns An object indicating valid is true or false.
   */
  verifyFingerprint(fingerprint: string): any {
    // fingerprint should have `z` prefix indicating
    // that it's multi-base encoded
    if (
      !(
        typeof fingerprint === "string" &&
        fingerprint[0] === MULTIBASE_ENCODED_BASE58_IDENTIFIER
      )
    ) {
      return {
        error: new Error("`fingerprint` must be a multibase encoded string."),
        valid: false,
      };
    }
    let fingerprintBuffer;
    try {
      fingerprintBuffer = bs58.decode(fingerprint.slice(1));
    } catch (e) {
      return { error: e, valid: false };
    }
    const publicKeyBuffer = new Buffer(this.publicKeyBuffer);

    // validate the first two multicodec bytes 0xea01
    const valid =
      fingerprintBuffer.slice(0, 2).toString("hex") === "ea01" &&
      publicKeyBuffer.equals(fingerprintBuffer.slice(2));
    if (!valid) {
      return {
        error: new Error("The fingerprint does not match the public key."),
        valid: false,
      };
    }
    return { valid };
  }
}
