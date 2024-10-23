package indexer

import (
	"context"
	"fmt"
	"github.com/golang/protobuf/proto"
	"ide/internal/code_indexer/services/pipeline"
	"ide/internal/interfaces"
)

func newInverseIndexerService(
	builder interfaces.InverseProtoBuilderService, storage interfaces.InverseIndexStorage, pool pipeline.Pool,
) interfaces.InverseIndexerService {
	return &inverseIndexer{
		builder: builder,
		storage: storage,
		pool:    pool,
	}
}

type inverseIndexer struct {
	builder interfaces.InverseProtoBuilderService
	storage interfaces.InverseIndexStorage
	pool    pipeline.Pool
}
