package main

import (
	"context"
	"crypto/ecdsa"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"log"
	"math/big"
	"math/rand"
	"sync"
	"time"

	"github.com/ethereum/go-ethereum/accounts/keystore"
	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/crypto"
	"github.com/libp2p/go-libp2p"
	"github.com/libp2p/go-libp2p/core/host"
	"github.com/libp2p/go-libp2p/core/network"
	"github.com/libp2p/go-libp2p/core/peer"
	"github.com/libp2p/go-libp2p/core/peerstore"
	"github.com/multiformats/go-multiaddr"
)

// fillerHandshakeProtocol is the protocol ID for exchanging address + signature
const fillerHandshakeProtocol = "/gaslessOrder/handshake/1.0.0"

// customProtocol is still used for sharing the GaslessCrossChainOrder (not fully shown)
const customProtocol = "/gaslessOrder/1.0.0"

// Bootnodes is a list of multiaddrs to which we connect
var Bootnodes = []string{
	// Example multiaddrs for “seed” or “boot” nodes:
	// Format: /ip4/<IP>/tcp/<PORT>/p2p/<PEER_ID>
	"/ip4/8.8.8.8/tcp/30303/p2p/QmBootNodeID5678efgh",
}

// GaslessCrossChainOrder is a simplified struct
type GaslessCrossChainOrder struct {
	User        string // user EOA
	Nonce       uint64
	OriginChain uint64
	DestChain   uint64
	Amount      *big.Int
	Signature   []byte
	// ... other fields ...
}

// FillerHandshake is what we send in the handshake
type FillerHandshake struct {
	PeerID     string // The sender’s libp2p peer ID (as a string)
	FillerAddr string // EVM address (e.g., "0xabc123...")
	Nonce      string // Hex-encoded random nonce
	Signature  string // Hex-encoded ECDSA signature over (PeerID, FillerAddr, Nonce)
}

// PeerInfo tracks which EVM address is associated with a peer.ID
var peerInfoMap sync.Map // map[peer.ID]common.Address

func main() {
	// Adjust for your environment
	keystoreDir := "./keystore"  // Directory with at least one Geth-style key file
	passphrase := "myPassphrase" // Passphrase to decrypt the key

	// 1) Load your local private key from keystore
	privKey, localAddr, err := loadPrivateKey(keystoreDir, passphrase)
	if err != nil {
		log.Fatalf("Failed to load private key: %v", err)
	}
	log.Printf("Loaded local EVM address: %s\n", localAddr.Hex())
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	// 2) Create a libp2p host. We import the private key into libp2p for identity
	//   (If you want libp2p to use a separate key, that is also possible, but
	//    for synergy we often unify identity with the same or a different key.)
	h, err := libp2p.New(libp2p.Identity((*cryptoECDSAKey)(privKey)))
	if err != nil {
		log.Fatalf("Failed to create host: %v", err)
	}
	defer h.Close()

	log.Printf("Libp2p Host ID: %s", h.ID())
	for _, addr := range h.Addrs() {
		log.Printf("Listening on %s/p2p/%s\n", addr, h.ID().Pretty())
	}

	// 3) Set a stream handler for the handshake protocol
	h.SetStreamHandler(fillerHandshakeProtocol, handleFillerHandshakeStream)

	// 4) Set a stream handler for the order protocol (optional)
	h.SetStreamHandler(customProtocol, handleOrderStream)

	// 5) If you have known peers (bootnodes), connect to them
	//    Example multiaddr format: /ip4/127.0.0.1/tcp/9000/p2p/<PeerID>
	// bootnodeAddr := "/ip4/127.0.0.1/tcp/9999/p2p/QmPeerIdXYZ"
	// dialPeer(context.Background(), h, bootnodeAddr, privKey, localAddr)
	if err := connectToBootnodes(ctx, h, Bootnodes); err != nil {
		log.Printf("Failed to connect bootnodes: %v\n", err)
	}
	// Keep running
	select {}
}

// connectToBootnodes attempts to dial each multiaddr in Bootnodes
func connectToBootnodes(ctx context.Context, h host.Host, nodes []string) error {
	for _, addrStr := range nodes {
		maddr, err := multiaddr.NewMultiaddr(addrStr)
		if err != nil {
			return fmt.Errorf("invalid multiaddr: %s", addrStr)
		}
		info, err := peer.AddrInfoFromP2pAddr(maddr)
		if err != nil {
			return fmt.Errorf("error parsing peer info: %w", err)
		}
		// Add to peerstore and dial
		h.Peerstore().AddAddrs(info.ID, info.Addrs, peerstore.TempAddrTTL)
		log.Printf("Dialing bootnode %s\n", info.ID)
		if err := h.Connect(ctx, *info); err != nil {
			log.Printf("Failed to connect to %s: %v\n", info.ID, err)
		} else {
			log.Printf("Connected to bootnode %s\n", info.ID)
		}
	}
	return nil
}

// loadPrivateKey loads an Ethereum private key from a Geth keystore directory.
func loadPrivateKey(keystoreDir, passphrase string) (*ecdsa.PrivateKey, common.Address, error) {
	// 1) Create a KeyStore handle
	ks := keystore.NewKeyStore(keystoreDir, keystore.StandardScryptN, keystore.StandardScryptP)

	// 2) Ensure we have at least one account
	if len(ks.Accounts()) == 0 {
		return nil, common.Address{}, fmt.Errorf("no key files found in %s", keystoreDir)
	}

	// For simplicity, take the first account
	acc := ks.Accounts()[0]

	// 3) Unlock the account
	if err := ks.Unlock(acc, passphrase); err != nil {
		return nil, common.Address{}, fmt.Errorf("failed to unlock account: %w", err)
	}

	// 4) Export the key in cleartext to get the *ecdsa.PrivateKey
	keyJson, err := ks.Export(acc, passphrase, passphrase)
	if err != nil {
		return nil, common.Address{}, fmt.Errorf("failed to export key: %w", err)
	}

	// 5) Import it again in memory (or parse it) to get the actual *ecdsa.PrivateKey
	newAcc, err := ks.Import(keyJson, passphrase, passphrase)
	if err != nil {
		return nil, common.Address{}, fmt.Errorf("failed to import key: %w", err)
	}
	_ = newAcc // Not strictly needed

	// Another approach is to parse the keyJson manually. For brevity, let's do:
	pk, err := ks.Key(acc, passphrase)
	if err != nil {
		return nil, common.Address{}, fmt.Errorf("failed to read key from keystore: %w", err)
	}
	privateKey := pk.PrivateKey
	fillerAddr := crypto.PubkeyToAddress(privateKey.PublicKey)

	return privateKey, fillerAddr, nil
}

// handleFillerHandshakeStream is called when a remote peer opens a stream using fillerHandshakeProtocol.
// We read their FillerHandshake, verify the signature, and store the mapping if valid.
func handleFillerHandshakeStream(s network.Stream) {
	defer s.Close()

	decoder := json.NewDecoder(s)
	var msg FillerHandshake
	if err := decoder.Decode(&msg); err != nil {
		log.Printf("Error decoding FillerHandshake from peer %s: %v", s.Conn().RemotePeer(), err)
		return
	}

	remotePeer := s.Conn().RemotePeer()
	log.Printf("Received handshake from %s: %+v\n", remotePeer, msg)

	// Verify the signature
	ok := verifyFillerHandshake(msg)
	if !ok {
		log.Printf("Invalid signature from peer %s. Closing stream.", remotePeer)
		return
	}

	// If valid, store the EVM address
	evmAddr := common.HexToAddress(msg.FillerAddr)
	peerInfoMap.Store(remotePeer, evmAddr)
	log.Printf("Peer %s -> EVM address %s. Verified & stored.\n", remotePeer, evmAddr)
}

// dialPeer demonstrates how we might dial a known multiaddr and then open a handshake stream
// using the local ECDSA key from the keystore
func dialPeer(ctx context.Context, h host.Host, peerAddr string, pk *ecdsa.PrivateKey, localAddr common.Address) {
	maddr, err := multiaddr.NewMultiaddr(peerAddr)
	if err != nil {
		log.Printf("Invalid multiaddr %s: %v", peerAddr, err)
		return
	}
	info, err := peer.AddrInfoFromP2pAddr(maddr)
	if err != nil {
		log.Printf("AddrInfoFromP2pAddr error: %v", err)
		return
	}

	if err = h.Connect(ctx, *info); err != nil {
		log.Printf("Failed to connect to peer %s: %v", info.ID, err)
		return
	}
	log.Printf("Connected to %s. Opening handshake stream...\n", info.ID)

	// Create a random nonce
	rand.Seed(time.Now().UnixNano())
	nonceVal := make([]byte, 8)
	rand.Read(nonceVal)
	nonceHex := hex.EncodeToString(nonceVal)

	// Create the FillerHandshake
	fh := FillerHandshake{
		PeerID:     h.ID().String(),
		FillerAddr: localAddr.Hex(),
		Nonce:      nonceHex,
	}

	// Sign it
	sig, err := signHandshake(pk, fh.PeerID, fh.FillerAddr, fh.Nonce)
	if err != nil {
		log.Printf("Error signing handshake: %v", err)
		return
	}
	fh.Signature = hex.EncodeToString(sig)

	// Open the stream
	s, err := h.NewStream(ctx, info.ID, fillerHandshakeProtocol)
	if err != nil {
		log.Printf("Could not open handshake stream: %v", err)
		return
	}
	defer s.Close()

	// Send the FillerHandshake as JSON
	enc := json.NewEncoder(s)
	if err := enc.Encode(fh); err != nil {
		log.Printf("Error sending FillerHandshake: %v", err)
	} else {
		log.Printf("Sent handshake to %s with filler addr %s\n", info.ID, fh.FillerAddr)
	}
}

// verifyFillerHandshake checks that the signature in FillerHandshake is valid
// for the claimed EVM address = ecrecover => fillerAddr
func verifyFillerHandshake(msg FillerHandshake) bool {
	sigBytes, err := hex.DecodeString(stripHex(msg.Signature))
	if err != nil {
		log.Printf("Could not decode signature hex: %v", err)
		return false
	}
	if len(sigBytes) != 65 {
		log.Printf("Signature must be 65 bytes (got %d)", len(sigBytes))
		return false
	}

	// Build the message that was signed
	data := []byte(msg.PeerID + "|" + msg.FillerAddr + "|" + msg.Nonce)
	digest := signHash(data)

	// ECDSA signatures in Ethereum are 65 bytes (R=32, S=32, V=1).
	// The "v" is the last byte.
	r := sigBytes[0:32]
	sPart := sigBytes[32:64]
	v := sigBytes[64]

	// Adjust v if needed (EIP-155, chainId, etc.), for now assume 27 or 28
	if v < 27 {
		v += 27
	}

	recoveredPubKey, err := crypto.SigToPub(digest, append(r, append(sPart, v-27)...))
	if err != nil {
		log.Printf("SigToPub error: %v", err)
		return false
	}
	recoveredAddr := crypto.PubkeyToAddress(*recoveredPubKey)
	claimedAddr := common.HexToAddress(msg.FillerAddr)

	if recoveredAddr != claimedAddr {
		log.Printf("Recovered address %s != claimed %s", recoveredAddr, claimedAddr)
		return false
	}
	return true
}

// signHandshake does a simple “personal_sign” style signature
func signHandshake(pk *ecdsa.PrivateKey, peerID, addr, nonce string) ([]byte, error) {
	message := []byte(peerID + "|" + addr + "|" + nonce)
	digest := signHash(message)
	return crypto.Sign(digest, pk)
}

// signHash applies the Ethereum Signed Message prefix and then keccak256
func signHash(data []byte) []byte {
	prefix := []byte("\x19Ethereum Signed Message:\n")
	msg := append(prefix, []byte(fmt.Sprintf("%d", len(data)))...)
	msg = append(msg, data...)
	return crypto.Keccak256(msg)
}

// handleOrderStream is called when a new peer opens a stream to send an order
func handleOrderStream(s network.Stream) {
	defer s.Close()
	decoder := json.NewDecoder(s)
	var order GaslessCrossChainOrder
	if err := decoder.Decode(&order); err != nil {
		log.Printf("Error decoding order from peer %s: %v\n", s.Conn().RemotePeer(), err)
		return
	}
	log.Printf("Received GaslessCrossChainOrder from peer %s: %+v\n", s.Conn().RemotePeer(), order)
	// In a real scenario, we'd probably check the signature, store the order, attempt to fill, etc.
}

// stripHex removes "0x" prefix from a hex string if present
func stripHex(s string) string {
	if len(s) > 1 && s[:2] == "0x" {
		return s[2:]
	}
	return s
}

/*
	------------------------------------------------------------------
	  Wrapping an *ecdsa.PrivateKey to satisfy libp2p's crypto interfaces
	  so we can pass it to libp2p.Identity(...).

------------------------------------------------------------------
*/
type cryptoECDSAKey ecdsa.PrivateKey

// Marshal is required for the PrivKey interface, but not used here
func (k *cryptoECDSAKey) Marshal() ([]byte, error) {
	return nil, fmt.Errorf("marshal not supported in this demo")
}

// Type returns the key type
func (k *cryptoECDSAKey) Type() string {
	return "ECDSA"
}

// Raw is not used in this demo
func (k *cryptoECDSAKey) Raw() ([]byte, error) {
	return nil, fmt.Errorf("raw not supported in this demo")
}

// Equals is a basic comparison
func (k *cryptoECDSAKey) Equals(other interface{}) bool {
	otherKey, ok := other.(*cryptoECDSAKey)
	if !ok {
		return false
	}
	return k.PublicKey.X.Cmp(otherKey.PublicKey.X) == 0 &&
		k.PublicKey.Y.Cmp(otherKey.PublicKey.Y) == 0 &&
		k.D.Cmp(otherKey.D) == 0
}

// Sign performs an ECDSA signature of the data with our private key
func (k *cryptoECDSAKey) Sign(data []byte) ([]byte, error) {
	digest := crypto.Keccak256(data)
	return crypto.Sign(digest, (*ecdsa.PrivateKey)(k))
}

// GetPublic returns a libp2p-compatible public key
func (k *cryptoECDSAKey) GetPublic() interface{} {
	return (*cryptoECDSAPubKey)(&k.PublicKey)
}

type cryptoECDSAPubKey ecdsa.PublicKey

func (pk *cryptoECDSAPubKey) Type() string {
	return "ECDSA"
}

func (pk *cryptoECDSAPubKey) Raw() ([]byte, error) {
	return nil, fmt.Errorf("raw not supported in this demo")
}

func (pk *cryptoECDSAPubKey) Equals(x interface{}) bool {
	otherKey, ok := x.(*cryptoECDSAPubKey)
	if !ok {
		return false
	}
	return pk.X.Cmp(otherKey.X) == 0 && pk.Y.Cmp(otherKey.Y) == 0
}
