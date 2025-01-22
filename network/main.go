package main

import (
	"context"
	"crypto/ecdsa"
	"fmt"
	"log"
	"sync"

	libp2pCrypto "github.com/libp2p/go-libp2p/core/crypto"
	pb "github.com/libp2p/go-libp2p/core/crypto/pb"

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

const fillerHandshakeProtocol = "/gaslessOrder/handshake/1.0.0"
const customProtocol = "/gaslessOrder/1.0.0"

var Bootnodes = []string{
	"/ip4/8.8.8.8/tcp/30303/p2p/QmBootNodeID5678efgh",
}

var peerInfoMap sync.Map

func main() {
	keystoreDir := "./keystore"
	passphrase := "myPassphrase"

	privKey, localAddr, err := loadPrivateKey(keystoreDir, passphrase)
	if err != nil {
		log.Fatalf("Failed to load private key: %v", err)
	}
	log.Printf("Loaded local EVM address: %s\n", localAddr.Hex())

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	h, err := libp2p.New(libp2p.Identity((*cryptoECDSAKey)(privKey)))
	if err != nil {
		log.Fatalf("Failed to create host: %v", err)
	}
	defer h.Close()

	log.Printf("Libp2p Host ID: %s", h.ID())
	for _, addr := range h.Addrs() {
		log.Printf("Listening on %s/p2p/%s\n", addr, h.ID().String())
	}

	h.SetStreamHandler(fillerHandshakeProtocol, handleFillerHandshakeStream)
	h.SetStreamHandler(customProtocol, handleOrderStream)

	if err := connectToBootnodes(ctx, h, Bootnodes); err != nil {
		log.Printf("Failed to connect to bootnodes: %v\n", err)
	}

	select {}
}

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

func handleFillerHandshakeStream(s network.Stream) {
	defer s.Close()
	log.Printf("Filler handshake stream opened with peer: %s", s.Conn().RemotePeer())
}

func handleOrderStream(s network.Stream) {
	defer s.Close()
	log.Printf("Order stream opened with peer: %s", s.Conn().RemotePeer())
}

func loadPrivateKey(keystoreDir, passphrase string) (*ecdsa.PrivateKey, common.Address, error) {
	ks := keystore.NewKeyStore(keystoreDir, keystore.StandardScryptN, keystore.StandardScryptP)

	if len(ks.Accounts()) == 0 {
		return nil, common.Address{}, fmt.Errorf("no key files found in %s", keystoreDir)
	}

	acc := ks.Accounts()[0]

	if err := ks.Unlock(acc, passphrase); err != nil {
		return nil, common.Address{}, fmt.Errorf("failed to unlock account: %w", err)
	}

	keyJson, err := ks.Export(acc, passphrase, passphrase)
	if err != nil {
		return nil, common.Address{}, fmt.Errorf("failed to export key: %w", err)
	}

	privateKey, err := crypto.ToECDSA(keyJson)
	if err != nil {
		return nil, common.Address{}, fmt.Errorf("failed to parse private key: %w", err)
	}

	fillerAddr := crypto.PubkeyToAddress(privateKey.PublicKey)
	return privateKey, fillerAddr, nil
}

type cryptoECDSAKey ecdsa.PrivateKey

func (k *cryptoECDSAKey) Equals(other libp2pCrypto.Key) bool {
	otherKey, ok := other.(*cryptoECDSAKey)
	if !ok {
		return false
	}
	return k.PublicKey.X.Cmp(otherKey.PublicKey.X) == 0 &&
		k.PublicKey.Y.Cmp(otherKey.PublicKey.Y) == 0 &&
		k.D.Cmp(otherKey.D) == 0
}

func (k *cryptoECDSAKey) Sign(data []byte) ([]byte, error) {
	return crypto.Sign(crypto.Keccak256(data), (*ecdsa.PrivateKey)(k))
}

func (k *cryptoECDSAKey) GetPublic() libp2pCrypto.PubKey {
	return &cryptoECDSAPubKey{
		PublicKey: k.PublicKey,
	}
}


func (k *cryptoECDSAKey) Type() pb.KeyType {
	return pb.KeyType_ECDSA
}

func (k *cryptoECDSAKey) Raw() ([]byte, error) {
	return crypto.FromECDSA((*ecdsa.PrivateKey)(k)), nil
}

type cryptoECDSAPubKey struct {
	ecdsa.PublicKey
}

func (pk *cryptoECDSAPubKey) Type() pb.KeyType {
	return pb.KeyType_ECDSA
}

func (pk *cryptoECDSAPubKey) Raw() ([]byte, error) {
	return crypto.FromECDSAPub(&pk.PublicKey), nil
}

func (pk *cryptoECDSAPubKey) Equals(x libp2pCrypto.Key) bool {
	otherKey, ok := x.(*cryptoECDSAPubKey)
	if !ok {
		return false
	}
	return pk.X.Cmp(otherKey.X) == 0 && pk.Y.Cmp(otherKey.Y) == 0
}

func (pk *cryptoECDSAPubKey) Verify(data []byte, sig []byte) (bool, error) {
	if len(sig) != 65 {
		return false, fmt.Errorf("Incorrect sig length")
	}

	// Recover the public key from the signature
	digest := crypto.Keccak256(data)
	recoveredPubKey, err := crypto.SigToPub(digest, sig)
	if err != nil {
		return false, err
	}

	// Compare the recovered public key to this public key
	recoveredECDSAPubKey := crypto.FromECDSAPub(recoveredPubKey)
	thisECDSAPubKey := crypto.FromECDSAPub(&pk.PublicKey)

	return string(recoveredECDSAPubKey) == string(thisECDSAPubKey), nil
}


